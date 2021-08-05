import { Subscription } from "rxjs";
import {
  TypeDefaultSpecialJsonType,
  TypeJsonData,
  _TypeJsonData,
  _TypeJsonMore,
} from "../json/jsonMore";
import { JsonBehaviorSubject, JsonSubject } from "./eventLib";

export type TypeGateway = {
  receive: (data: string) => void;
  destory: () => void;
};

export type GatewayMessage = {
  label: "GatewayMessage";
  subjectName: string;
  data: TypeJsonData;
  fromMaster: boolean;
};

export const switchEventInSubjects = <T>(
  subjects: Record<string, any>,
  jsonMore: _TypeJsonMore<T | TypeDefaultSpecialJsonType>
) => {
  return (
    send: (data: string) => void,
    isMaster: boolean,
    packer?: (
      data: _TypeJsonData<T | TypeDefaultSpecialJsonType>
    ) => _TypeJsonData<T | TypeDefaultSpecialJsonType>,
    unPacker?: (
      data: _TypeJsonData<T | TypeDefaultSpecialJsonType>
    ) => _TypeJsonData<T | TypeDefaultSpecialJsonType>
  ): TypeGateway => {
    let destoried = false;
    const subscribes: Subscription[] = [];
    const subjectLastValueMap: Record<string, any> = {};
    Object.entries(subjects).forEach(([subjectName, subject]) => {
      if (
        !(
          subject instanceof JsonSubject ||
          subject instanceof JsonBehaviorSubject
        )
      )
        return;
      const sendMsg = (data: TypeJsonData) => {
        if (data === subjectLastValueMap[subjectName]) return;
        const msg: GatewayMessage = {
          label: "GatewayMessage",
          subjectName,
          data,
          fromMaster: isMaster,
        };
        try {
          send(jsonMore.stringify(packer ? packer(msg) : msg));
        } catch (e) {
          subjects.EvLogError(
            "Error in eventGateway, failed to stringify message data: ",
            data,
            "\nerror: ",
            e
          );
        }
      };
      if (!isMaster && subject instanceof JsonBehaviorSubject)
        subjectLastValueMap[subjectName] = subject.value;
      subscribes.push(subject.subscribe(sendMsg));
    });
    return {
      receive: (data: string) => {
        if (destoried) return;
        try {
          // @ts-ignore
          const msg: GatewayMessage | null = unPacker
            ? unPacker(jsonMore.parse(data))
            : jsonMore.parse(data);
          if (msg && msg.label === "GatewayMessage") {
            subjectLastValueMap[msg.subjectName] = msg.data;
            // @ts-ignore
            subjects[msg.subjectName]?.next?.(msg.data);
          }
        } catch (e) {
          subjects.EvLogError(
            "Error in eventGateway, failed to parse message data: ",
            data,
            "\nerror: ",
            e
          );
        }
      },
      destory: () => {
        subscribes.forEach((sub) => sub.unsubscribe());
        destoried = true;
      },
    };
  };
};
