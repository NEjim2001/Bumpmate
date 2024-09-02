import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Menu from "./Menu";

import "./style.css";

export const MainButton = () => {
  const [active, setActive] = useState(false);
  const iconUrl = chrome?.runtime
    ? chrome?.runtime?.getURL("iconTransparent.png")
    : "/iconTransparent.png";

  const MenuHandler = () => {
    setActive(!active);
  };

  return (
    <div className="fixed h-18 flex flex-row bottom-0 items-end right-0 m-8 z-10">
      <motion.div
        className="h-10 rounded-sm flex justify-end items-end"
        animate={{
          width: active ? 285 : 50,
        }}
        initial={false}
        transition={{ duration: 0.2, delay: active ? 0 : 0.3 }}
      >
        <motion.div
          animate={{
            height: active ? 455 : 50,
            opacity: active ? 1 : 0,
          }}
          initial={false}
          transition={{ duration: 0.2, delay: active ? 0.3 : 0.1 }}
        >
          <Menu onClick={MenuHandler} />
        </motion.div>
      </motion.div>
      <motion.div
        className="z-10 absolute border-2 border-white flex bg-gradient-to-r from-mainRed to-secondaryRed h-16 w-16 rounded-full justify-center items-center shadow-sm hover:shadow-md transition-shadow duration-300"
        onClick={() => !active && MenuHandler()}
        whileHover={{
          scale: active ? 1 : 1.1,
        }}
        whileTap={{ scale: 0.9 }}
        animate={{
          opacity: active ? 0 : 1,
          pointerEvents: active ? "none" : "auto",
        }}
        initial={false}
        transition={{ duration: 0.3, delay: active ? 0 : 0.2 }}
      >
        <img src={iconUrl} alt="BumpMate Extension Logo" />
      </motion.div>
    </div>
  );
};

export default MainButton;
