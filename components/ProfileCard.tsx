import React from "react";
import { TextField } from "@mui/material";
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth/web-extension";
import { useDispatch, useSelector } from "react-redux";
import { setMembership, setUser } from "../redux/slices/user";
import {
  doc,
  getDocs,
  query as firebaseQuery,
  where,
  getDoc,
  setDoc,
  collection,
} from "firebase/firestore";
import { getFriendlyErrorMessage } from "../scripts/errorMessageMap";
import PurchaseModal from "./PurchaseModal";
import { getPortalUrl } from "../scripts/stripe";
import { auth, db } from "../config/firebase";

import "./style.css";

export default function ProfileCard() {
  const dispatch = useDispatch();
  const storedUser = useSelector((state: any) => state.user);
  const [open, setOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        dispatch(
          setUser({ email: "", uid: "", membership: "", taskTokens: 0 })
        );
        localStorage.removeItem("user");
        localStorage.removeItem("lft");
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  useEffect(() => {
    const fetchTimeRemaining = () => {
      const now = new Date();
      const utcNow = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          now.getUTCHours(),
          now.getUTCMinutes(),
          now.getUTCSeconds()
        )
      );

      // Calculate time remaining until next midnight UTC
      const nextMidnightUtc = new Date(
        Date.UTC(
          utcNow.getUTCFullYear(),
          utcNow.getUTCMonth(),
          utcNow.getUTCDate() + 1,
          0,
          0,
          0
        )
      );

      // Define the 2-minute range before and after midnight
      const twoMinutesBeforeMidnight = new Date(
        nextMidnightUtc.getTime() - 2 * 60 * 1000
      );
      const twoMinutesAfterMidnight = new Date(
        nextMidnightUtc.getTime() + 2 * 60 * 1000
      );

      if (
        utcNow >= twoMinutesBeforeMidnight &&
        utcNow <= twoMinutesAfterMidnight
      ) {
        setTimeRemaining("Daily task tokens have been reset");
        return;
      }

      // Calculate time remaining if outside the 2-minute range
      const timeRemainingMs = nextMidnightUtc.getTime() - utcNow.getTime();
      const hoursRemaining = Math.floor(timeRemainingMs / (1000 * 60 * 60));
      const minutesRemaining = Math.floor(
        (timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60)
      );

      setTimeRemaining(
        `${hoursRemaining} hours, ${minutesRemaining} minutes until more task tokens`
      );
    };
    fetchTimeRemaining();
  }, []);

  const manageSubscription = async () => {
    try {
      const url = await getPortalUrl();

      if (url) {
        window.location.href = url;
      } else {
        console.error("No URL returned from getPortalUrl");
      }
    } catch (error) {
      console.error("Error in manageSubscription:", error.message);
    }
  };

  return (
    <div className="h-full">
      {storedUser.uid != "" ? (
        <section className="shadow-xl w-72 h-full flex justify-evenly flex-col px-4">
          <div className="flex flex-row w-full ">
            <div className="flex-col flex px-3 text-xl font-semibold">
              <div className="w-full text-mainRed italic bg-clip-text">
                PROFILE
              </div>
              <div className="w-[80px] bg-mainRed rounded-lg min-h-[4px]" />
            </div>
            <p className="text-mainRed  font-normal    text-end  flex flex-row text-xs">
              {timeRemaining}
            </p>
          </div>
          <div className="flex flex-col h-72 bg-mainGray py-3 px-4 text-mainRed gap-3">
            <section className="flex flex-col items-center justify-center gap-2 flex-grow">
              <div className="text-center text-lg">
                <div className="italic bg-clip-text font-bold">User</div>
                <div className="mt-1 italic font-medium">
                  {storedUser?.email}
                </div>
              </div>

              <div className="text-center ">
                <div className="italic bg-clip-text font-bold">Support</div>
                <div className="mt-1 text-sm italic font-medium">
                  bumpmate.bot@gmail.com
                </div>
              </div>

              <div className="text-center">
                <div className="italic bg-clip-text font-bold">Version</div>
                <div className="mt-1 text-md italic font-medium">1.0.0</div>
              </div>
            </section>

            <div className="flex flex-col gap-1">
              <button
                onClick={handleSignOut}
                className="flex-grow w-full py-2 text-md italic font-medium text-white bg-mainRed rounded-md shadow-sm hover:bg-opacity-80 transition duration-300"
              >
                SIGN OUT
              </button>

              <button
                onClick={
                  storedUser?.membership == "basic"
                    ? handleOpen
                    : manageSubscription
                }
                style={{
                  background:
                    storedUser?.membership !== "basic"
                      ? "linear-gradient(to right, #ffbb00, #FFB800)"
                      : "gray",
                }}
                className="flex-grow w-full py-2 text-md italic font-medium text-white rounded-md shadow-sm hover:bg-opacity-80 transition duration-300"
              >
                {storedUser?.membership !== "basic"
                  ? "Manage Subscription"
                  : "Upgrade Membership"}
              </button>
            </div>

            <PurchaseModal
              handleClose={handleClose}
              open={open}
              outOfTaskTokens={false}
            />
          </div>
        </section>
      ) : (
        <LoggedOutCard />
      )}
    </div>
  );
}

const LoggedOutCard = () => {
  const [email, setEmail] = useState("");
  const [resetEmailInput, setResetEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [passwordModal, setPasswordModal] = useState(false);
  const [acceptModal, setAcceptModal] = useState(false);
  const dispatch = useDispatch();

  const fetchUserAndSubscriptionData = async (uid: string) => {
    try {
      const userDocRef = doc(db, "customers", uid);
      const userDoc = await getDoc(userDocRef);

      let taskTokens = 0;

      if (userDoc.exists()) {
        const userData = userDoc.data();
        taskTokens = userData.taskTokens;
      }

      // Fetch subscription data
      const subscriptionsRef = collection(
        db,
        "customers",
        uid,
        "subscriptions"
      );
      const q = firebaseQuery(
        subscriptionsRef,
        where("status", "!=", "canceled")
      );
      const subscriptionSnapshot = await getDocs(q);

      let membershipTier = "basic";
      if (!subscriptionSnapshot.empty) {
        const subscriptionDoc = subscriptionSnapshot.docs[0];
        const subscriptionData = subscriptionDoc.data();
        membershipTier = subscriptionData.tier;
        localStorage.setItem("trialUsed", "true");
      }

      dispatch(setMembership(membershipTier));
      return { membershipTier, taskTokens };
    } catch (error) {
      console.error("Error fetching user or subscription data:", error);
      return { membershipTier: "basic", taskTokens: 0 };
    }
  };

  // Usage in handleSignIn
  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const userData = await fetchUserAndSubscriptionData(user.uid);

      dispatch(
        setUser({
          email: user.email,
          uid: user.uid,
          membership: userData.membershipTier,
          taskTokens: userData.taskTokens,
        })
      );
      localStorage.setItem(
        "user",
        JSON.stringify({
          email: user.email,
          uid: user.uid,
          membership: userData.membershipTier,
          taskTokens: userData.taskTokens,
        })
      );
    } catch (error) {
      alert(getFriendlyErrorMessage(error.code));
      console.error("Error signing in:", error);
    }
  };

  // Usage in handleRegister
  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userDocRef = doc(db, "customers", user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        taskTokens: 100,
      });

      dispatch(
        setUser({
          email: user.email,
          uid: user.uid,
          membership: "basic",
          taskTokens: 100,
        })
      );
      localStorage.setItem(
        "user",
        JSON.stringify({
          email: user.email,
          uid: user.uid,
          membership: "basic",
          taskTokens: 100,
        })
      );
      localStorage.setItem("trialUsed", "false");
    } catch (error) {
      console.error("Error registering:", error);
    }
  };

  const handlePasswordReset = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(resetEmailInput)) {
      alert("Please enter a valid email address.");
      return;
    }
    sendPasswordResetEmail(auth, resetEmailInput)
      .then(() => {
        alert("Password reset email sent");
        setPasswordModal(false);
      })
      .catch((error) => {
        alert(error.message);
      });
  };

  return (
    <section className="shadow-xl w-72 h-full flex justify-evenly flex-col ">
      <div className="flex-col flex px-7 text-xl font-semibold">
        <div className="w-full text-mainRed italic bg-clip-text">LOGIN</div>
        <div className="w-[80px] bg-mainRed rounded-lg min-h-[4px]" />
      </div>
      <div className="flex flex-col h-72 bg-mainGray py-3 px-2 mx-4 text-mainRed gap-3">
        <section className="flex flex-col items-center justify-center gap-2 flex-grow">
          <TextField
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            fullWidth
            variant="outlined"
            className="bg-white rounded-md"
          />
          <TextField
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            fullWidth
            variant="outlined"
            className="bg-white rounded-md"
          />
          <button
            onClick={handleSignIn}
            className="flex-grow w-full py-2 text-md italic font-medium text-white bg-mainRed rounded-md shadow-sm hover:bg-opacity-80 transition duration-300"
          >
            LOGIN
          </button>
          <button
            onClick={() => setAcceptModal(true)}
            className="flex-grow w-full py-2 text-md italic font-medium text-white bg-mainRed rounded-md shadow-sm hover:bg-opacity-80 transition duration-300"
          >
            REGISTER
          </button>
          <button
            onClick={() => setPasswordModal(true)}
            className="flex-grow w-full py-2 text-md italic font-medium text-mainRed bg-white border-2 border-mainRed rounded-md shadow-sm hover:bg-mainRed hover:text-white transition duration-300"
          >
            FORGOT PASSWORD?
          </button>
        </section>
      </div>

      {passwordModal && (
        <div className="absolute w-full h-[360px] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md">
            <h2 className="text-mainRed font-bold">Reset Password</h2>
            <TextField
              type="email"
              value={resetEmailInput}
              onChange={(e) => setResetEmailInput(e.target.value)}
              placeholder="Email"
              fullWidth
              variant="outlined"
              className="bg-white rounded-md mt-2"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handlePasswordReset}
                className="flex-grow py-2 text-md italic font-medium text-white bg-mainRed rounded-md shadow-sm hover:bg-opacity-80 transition duration-300"
              >
                SEND EMAIL
              </button>
              <button
                onClick={() => setPasswordModal(false)}
                className="flex-grow py-2 text-md italic font-medium text-mainRed bg-white border-2 border-mainRed rounded-md shadow-sm hover:bg-mainRed hover:text-white transition duration-300"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {acceptModal && (
        <div className="absolute  w-full h-[360px] bg-black bg-opacity-50 flex items-center justify-center ">
          <div className="bg-white p-4 rounded-md m-10">
            <h2 className="text-mainRed font-bold">Terms and Conditions</h2>
            <p className="mt-2">
              By registering, you agree to our Terms and Conditions.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleRegister}
                className="flex-grow py-2 text-md italic font-medium text-white bg-mainRed rounded-md shadow-sm hover:bg-opacity-80 transition duration-300"
              >
                ACCEPT
              </button>
              <button
                onClick={() => setAcceptModal(false)}
                className="flex-grow py-2 text-md italic font-medium text-mainRed bg-white border-2 border-mainRed rounded-md shadow-sm hover:bg-mainRed hover:text-white transition duration-300"
              >
                DECLINE
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
