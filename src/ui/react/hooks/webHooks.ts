import { useEffect, useState } from "react";

const getWindowSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});
export const useWindowSize = () => {
  const [state, setState] = useState(getWindowSize);
  useEffect(() => {
    const listener = () => {
      setState(getWindowSize);
    };
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, []);
  return state;
};
