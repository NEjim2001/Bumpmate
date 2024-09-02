import React, { useEffect, useState } from "react";
import Backdrop from "@mui/material/Backdrop";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";

export default function ActionModal({ open, handleClose }) {
  const [disableReminder, setDisableReminder] = useState(false);
  const iconUrl = chrome?.runtime
    ? chrome?.runtime?.getURL("icon.png")
    : "/icon.png";

  useEffect(() => {
    const storedPreference = localStorage.getItem("disableReminder");
    if (storedPreference === "true") {
      setDisableReminder(true);
    }
  }, []);

  const handleCheckboxChange = () => {
    const newValue = !disableReminder;
    setDisableReminder(newValue);
    localStorage.setItem("disableReminder", newValue.toString());
  };

  return (
    <Modal
      open={open}
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      aria-modal="true"
      onClose={handleClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { timeout: 500 } }}
    >
      <Fade in={open}>
        <div className="h-screen w-screen flex items-center justify-center p-4">
          <div className="relative bg-white shadow-md rounded-lg max-w-1/2 max-h-full p-6 sm:p-8 flex flex-col items-center">
            <div className="w-full text-center text-2xl sm:text-3xl font-bold text-mainRed italic flex items-center justify-center mb-4">
              <img
                src={iconUrl}
                alt="BumpMate Extension Logo"
                className="h-8 sm:h-10"
              />
              BumpMate
            </div>
            <div className="w-full mb-4 flex flex-col items-center space-y-2">
              <p
                className="text-black text-2xl sm:text-4xl font-extrabold text-center"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Your Action has Begun
              </p>
              <span className="text-gray-600 text-base sm:text-lg text-center">
                Now, sit back and watch your{" "}
                <span className="text-mainRed font-bold">Depop</span> shop grow!
              </span>
            </div>
            <section className="flex flex-col items-center w-full">
              <span className="text-gray-600 text-base sm:text-lg text-center mb-4">
                <span className="text-red-500 font-black">WARNING! </span>
                Refreshing or Closing this webpage will{" "}
                <span className="text-mainRed font-bold">interrupt </span>
                your sharing process. <br></br>For optimal performance, keep
                this tab open in the background.
              </span>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="disableReminder"
                  checked={disableReminder}
                  onChange={handleCheckboxChange}
                  className="mr-2"
                />
                <label
                  htmlFor="disableReminder"
                  className="text-gray-600 text-base sm:text-lg"
                >
                  Don't show this reminder again
                </label>
              </div>
            </section>
          </div>
        </div>
      </Fade>
    </Modal>
  );
}
