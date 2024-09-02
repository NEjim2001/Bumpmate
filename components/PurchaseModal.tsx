import React, { useEffect, useState } from "react";
import Backdrop from "@mui/material/Backdrop";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import { useSelector } from "react-redux";
import axios from "axios";
import { getRandomMessage } from "../scripts/getPurchaseModalResponse";

export default function PurchaseModal({
  open,
  handleClose,
  title = "Choose Your Plan",
  outOfTaskTokens,
}) {
  const [body, setBody] = useState(getRandomMessage());
  const userMembership = useSelector((state: any) => state.user.membership);
  const storedUser = useSelector((state: any) => state.user);
  const iconUrl = chrome?.runtime
    ? chrome?.runtime?.getURL("icon.png")
    : "/icon.png";

  const isButtonDisabled = (tier: string) => {
    const tiers = ["basic", "plus", "premium"];
    return tiers.indexOf(userMembership) >= tiers.indexOf(tier);
  };

  const startCheckoutSession = async (tier: any) => {
    const trialUsed = localStorage.getItem("trialUsed");
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/create-checkout-session`,
        {
          uid: storedUser.uid,
          tier,
          trialUsed,
          return_url: window.location.href.split("?")[0],
        }
      );

      if (response && response.status === 200) {
        localStorage.removeItem("lft");
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error(error.response.data);
    }
  };

  const handleButtonClick = (tier: string) => {
    startCheckoutSession(tier);
  };

  useEffect(() => {
    if (open) {
      setBody(getRandomMessage());
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      slots={{
        backdrop: Backdrop,
      }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={open}>
        <div className="flex items-center justify-center h-screen w-screen">
          <div className="relative bg-white shadow-md rounded-lg max-w-full max-h-full p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row lg:gap-4">
            <div className="flex flex-col items-center">
              <div className="w-full text-center text-2xl sm:text-3xl font-bold text-mainRed italic flex items-center justify-center mb-2">
                <img
                  src={iconUrl}
                  alt="BumpMate Extension Logo"
                  className="h-8 sm:h-10"
                />
                BumpMate
              </div>
              <div className="w-full mb-4 flex flex-col items-center space-y-1">
                <p
                  className="text-black text-2xl sm:text-4xl font-extrabold text-center"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {title}
                </p>
                {outOfTaskTokens ? (
                  <span className="text-gray-600 text-base sm:text-lg text-center">
                    {body}
                  </span>
                ) : (
                  <span className="text-gray-600 text-base sm:text-lg text-center">
                    and take your{" "}
                    <span className="text-mainRed font-bold">Depop</span> shop
                    to the next level
                  </span>
                )}
              </div>

              <section className="flex flex-col lg:flex-row lg:justify-between lg:w-full lg:gap-4">
                {/* Basic Card */}
                <div className="bg-white border-2 border-gray-500 rounded-lg shadow-md flex flex-col items-center text-center w-full lg:w-1/3 p-4 lg:p-6">
                  <p className="font-bold text-gray-800 text-xl sm:text-2xl">
                    Basic
                  </p>
                  <span className="text-gray-600 text-xs sm:text-sm">
                    For Beginner Shops <br /> (New Users)
                  </span>
                  <div className="mt-8">
                    <span className="text-gray-800 text-xl sm:text-2xl font-semibold flex justify-center mb-3">
                      <span className="text-2xl sm:text-5xl font-extrabold flex items-center">
                        <span className="text-xl">$</span>0
                      </span>
                      /mo
                    </span>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      Billed monthly, cancel anytime
                    </p>
                  </div>
                  <button
                    className={`mt-4 bg-gray-300 text-gray-800 px-4 py-2 rounded-md w-full text-xs sm:text-sm font-semibold transition ${
                      isButtonDisabled("basic")
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-400"
                    }`}
                    disabled={isButtonDisabled("basic")}
                    onClick={() => handleButtonClick("basic")}
                  >
                    Select Plan
                  </button>
                  <div className="mt-4 w-full text-left">
                    <p className="text-gray-800 text-sm sm:text-lg font-semibold mb-2">
                      What's included...
                    </p>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      ✓ 100 daily task tokens
                      <br />
                      ✓ Regular customer support
                      <br />
                      ✓ Following and bumping actions
                      <br />✓ Grow your shop!
                    </p>
                  </div>
                </div>

                {/* Plus Card */}
                <div className="relative bg-white border-mainRed border-2 rounded-lg shadow-md flex flex-col items-center text-center w-full lg:w-1/3 p-4 lg:p-6 ">
                  <div className="absolute top-0 right-0 bg-red-600 text-white px-2 py-1 rounded-l-full text-xs sm:text-sm font-bold shadow-sm">
                    Most Popular
                  </div>
                  <p className="font-bold text-red-600 text-2xl sm:text-4xl mt-2">
                    Plus+
                  </p>
                  <span className="text-gray-600 text-xs sm:text-sm">
                    For Intermediate Shops <br /> (30 - 200 Sales)
                  </span>

                  <div className="mt-4 w-full flex flex-col">
                    <span className="text-red-600 text-xl sm:text-3xl font-semibold flex justify-center">
                      <span className="text-4xl sm:text-6xl font-extrabold flex items-center">
                        <span className="text-2xl">$</span>7.99
                      </span>
                      /mo
                    </span>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      Billed monthly, cancel anytime
                    </p>
                    <button
                      className={`mt-4 bg-red-600 text-white px-4 py-2 rounded-md w-full text-xs sm:text-sm font-semibold transition ${
                        isButtonDisabled("plus")
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-red-700"
                      }`}
                      disabled={isButtonDisabled("plus")}
                      onClick={() => handleButtonClick("plus")}
                    >
                      {localStorage.getItem("trialUsed") != "true"
                        ? "Start 7 Day Trial"
                        : "Select Plan"}
                    </button>
                  </div>
                  <div className="mt-4 w-full text-left">
                    <p className="text-red-600 text-sm sm:text-lg font-semibold mb-2">
                      What's included...
                    </p>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      ✓ 400 daily task tokens
                      <br />
                      ✓ Advanced customer support
                      <br />
                      ✓ All features of Basic
                      <br />✓ Liking features and sending offers
                      <br />
                      ✓ Priority access to new features
                      <br />✓ Drive your success
                    </p>
                  </div>
                </div>

                {/* Premium Card */}
                <div className="relative bg-white border-yellow-600 border-2 rounded-lg shadow-md flex flex-col items-center text-center w-full lg:w-1/3 p-4 lg:p-6 ">
                  <div className="absolute top-0 right-0 bg-yellow-600 text-white px-2 py-1 rounded-l-full text-xs sm:text-sm font-bold shadow-sm">
                    Best Value
                  </div>
                  <p className="font-bold text-yellow-600 text-2xl sm:text-4xl mt-2">
                    Premium🏆
                  </p>
                  <span className="text-gray-600 text-xs sm:text-sm">
                    For Expert Shops <br /> (200+ Sales)
                  </span>
                  <div className="mt-4">
                    <span className="text-yellow-600 text-xl sm:text-2xl font-semibold flex justify-center">
                      <span className="text-4xl sm:text-6xl font-extrabold flex items-center">
                        <span className="text-lg">$</span>13.99
                      </span>
                      /mo
                    </span>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      Billed monthly, cancel anytime
                    </p>
                  </div>
                  <button
                    className={`mt-4 bg-yellow-600 text-white px-4 py-2 rounded-md w-full text-xs sm:text-sm font-semibold transition ${
                      isButtonDisabled("premium")
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-yellow-700"
                    }`}
                    disabled={isButtonDisabled("premium")}
                    onClick={() => handleButtonClick("premium")}
                  >
                    {localStorage.getItem("trialUsed") != "true"
                      ? "Start 7 Day Trial"
                      : "Select Plan"}
                  </button>
                  <div className="mt-4 w-full text-left">
                    <p className="text-yellow-600 text-sm sm:text-lg font-semibold mb-2">
                      What's included...
                    </p>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      ✓ Unlimited daily task tokens
                      <br />
                      ✓ Expert customer support
                      <br />✓ All features of Plus
                      <br />
                      ✓ Personalized shop consultations
                      <br />
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </Fade>
    </Modal>
  );
}
