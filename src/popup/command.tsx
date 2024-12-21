import { useEffect, useState } from "react";

const targetSequence = ["s", "e", "c", "r", "e", "t"];

type Props = {
  triggerAction: () => void;
};

const Command = (props: Props) => {
  const [inputSequence, setInputSequence] = useState([] as string[]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setInputSequence((prevSequence: string[]) => {
        const newSequence = [...prevSequence, event.key].slice(
          -targetSequence.length
        );
        return newSequence;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (inputSequence.join(",") === targetSequence.join(",")) {
      props.triggerAction();
    }
  }, [inputSequence, props]);

  return <></>;
};

export default Command;
