import React, { useEffect, useState, useContext, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MenuActionContext } from "../context/MenuActionProvider";
import ProgressBar from "@ramonak/react-progress-bar";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { decrementTaskTokens, setTaskTokens } from "../redux/slices/user";
import { CircleStackIcon } from "@heroicons/react/24/solid";
import PurchaseModal from "./PurchaseModal";
import ActionModal from "./ActionModal";
import "./style.css";
import axios from "axios";
import { io } from "socket.io-client";
import { handleActionEvent } from "../scripts/handleActionEvent";
import { getRandomMessage } from "../scripts/getPurchaseModalResponse";

// Interfaces
interface Settings {
  delay: number;
  percentage: number;
  taskLimit: number;
  unfollowExpectionList: any[];
  followExpectionList: any[];
  bumpFromBottom: boolean;
  uid: string;
}

interface CardProps {
  settings: Settings;
}

// Helper function to determine if the URL is a store URL
const isStoreUrl = (url: string) => {
  // Check if URL contains a username pattern after "depop/" with optional paths
  const storeUrlPattern =
    /^https:\/\/www\.depop\.com\/[a-zA-Z0-9_-]+\/(?:selling|sold|likes)?\/?$/;
  const path = new URL(url).pathname;
  return storeUrlPattern.test(`https://www.depop.com${path}`);
};

const HomeCard = () => {
  const { isMenuOpen, setActiveAction, activeAction } =
    useContext(MenuActionContext);
  const [currentPage, setCurrentPage] = useState<string>("");
  const [cookiesString, setCookies] = useState<string>("");

  const [currentIndex, setCurrentIndex] = useState("0/0");
  const socketRef = useRef<any>(null);

  const storedSettings = localStorage.getItem("bumpSettings");
  const settings: Settings = storedSettings ? JSON.parse(storedSettings) : {};
  const uid = useSelector((state: any) => state.user.uid);
  const storedTaskTokens = useSelector((state: any) => state.user.taskTokens);
  const taskLimit = settings.taskLimit || 0;
  const dispatch = useDispatch();
  const [openPurchase, setOpenPurchase] = useState(false);
  const [openAlert, setOpenAlert] = useState(false);
  const [localTaskTokens, setLocalTaskTokens] = useState(storedTaskTokens);
  const [pageUrl, setPageUrl] = useState(window.location.href);

  const storedUser = useSelector((state: any) => state.user);

  useEffect(() => {
    const handleUrlChange = (event) => {
      setPageUrl(event.detail);
    };

    window.addEventListener("url_change", handleUrlChange);

    // Clean up the event listener
    return () => {
      window.removeEventListener("url_change", handleUrlChange);
    };
  }, []);

  useEffect(() => {
    if (isStoreUrl(pageUrl)) {
      pageUrl.includes(username)
        ? setCurrentPage("User")
        : setCurrentPage("OtherSellerCard");
    } else {
      setCurrentPage("BlankCard");
    }
  }, [pageUrl]);

  const usernameElement =
    document.querySelector(
      "a.styles_unstyledLink__DsttP.styles_navigationLink__z5tq1[href*='/likes/']"
    ) || document.querySelector('a[data-testid="extendedLinkAnchor"]');

  const username =
    usernameElement
      ?.getAttribute("href")
      ?.match(/^\/([^\/]+)\/likes\/$/)?.[1] || "";

  const stopTask = async () => {
    try {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/stop-task/${uid}`
      );
      const userDocRef = doc(db, "customers", uid);
      await updateDoc(userDocRef, {
        taskTokens: localTaskTokens,
      });
      setActiveAction("");
      setCurrentIndex("0/0");
    } catch (error) {
      console.error("Exiting at user:", username, "with error:", error);
    }
  };

  useEffect(() => {
    if (chrome.runtime) {
      chrome.runtime.sendMessage({ action: "getCookies" }, (response) => {
        if (response.cookies) {
          setCookies(JSON.stringify(response.cookies));
        } else {
          console.error("No cookies received.");
        }
      });
    }
  }, []);

  useEffect(() => {
    const cachedUserString = localStorage.getItem("user");
    const cachedUser = cachedUserString ? JSON.parse(cachedUserString) : {};

    if (cachedUser.uid) {
      const userDocRef = doc(db, "customers", cachedUser.uid);

      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          dispatch(setTaskTokens(userData.taskTokens));
          const updatedUser = {
            ...cachedUser,
            taskTokens: userData.taskTokens,
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        } else {
          console.error("No such document in Firestore!");
        }
      });

      return () => unsubscribe();
    }
  }, [dispatch]);

  useEffect(() => {
    const handleSocket = async () => {
      if (isMenuOpen && !socketRef.current && activeAction) {
        socketRef.current = io(
          `${import.meta.env.VITE_SERVER_URL.replace(/^http:/, "ws:").replace(
            /^https:/,
            "wss:"
          )}`
        );

        socketRef.current.on("connect", () => {
          socketRef.current.emit("register", username);
        });

        socketRef.current.on("message", async (message: any) => {
          if (message === "complete") {
            await stopTask();
            alert("Task Completed!");
            return;
          }

          dispatch(decrementTaskTokens());
          setLocalTaskTokens((prev: any) => prev - 1);
          setCurrentIndex(message);
        });
      } else if (activeAction === "" && socketRef.current) {
        // Disconnect socket when action is no longer active
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };

    handleSocket();

    // Clean up socket connection on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isMenuOpen, activeAction, username, dispatch]);

  useEffect(() => {
    const handleTask = async () => {
      if (activeAction === "") return;
      const stepNumber = parseInt(currentIndex.split("/")[0]);
      if (storedTaskTokens == 0) {
        setOpenPurchase(true);
        await stopTask();
        return alert("You have no task tokens left");
      }
      if (stepNumber === taskLimit && taskLimit !== 0) {
        await stopTask();
        return alert("You have reached your task limit");
      }
    };

    handleTask();
  }, [currentIndex]);

  useEffect(() => {
    if (activeAction === "" && socketRef.current) {
      // Disconnect socket if no active action
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [activeAction]);

  const handleClose = (action: string) => {
    action === "purchase" ? setOpenPurchase(false) : setOpenAlert(false);
  };

  useEffect(() => {
    if (uid === "" || activeAction === "") return;
    const preventUnload = async () => {
      try {
        axios.get(`${import.meta.env.VITE_SERVER_URL}/api/stop-task/${uid}`);
      } catch (error) {
        console.error("Error updating task tokens:", error);
      }
    };

    window.addEventListener("beforeunload", preventUnload);

    return () => {
      window.removeEventListener("beforeunload", preventUnload);
    };
  }, [uid, storedTaskTokens, activeAction]);

  return (
    <section className="shadow-xl w-72 h-full flex justify-evenly flex-col px-4">
      <div className="flex flex-row font-semibold ">
        <div className="flex-col flex px-3 text-xl font-semibold">
          <div className="w-full text-mainRed italic bg-clip-text">HOME</div>
          <div className="w-full bg-mainRed rounded-lg min-h-[4px]" />
        </div>

        <span className="text-mainRed hover:cursor-pointer font-medium flex items-center justify-end gap-1 w-full ">
          <span className="text-xs text-end">Total Task Tokens:</span>
          <span className="font-bold text-lg flex items-center gap-1">
            <CircleStackIcon className="shrink-0 w-5 h-5" />
            <span className="flex-shrink-0">
              {localTaskTokens > 1000 ? "∞" : localTaskTokens}
            </span>
          </span>
        </span>
      </div>
      {currentPage === "User" && (
        <UserCard
          settings={settings}
          cookies={cookiesString}
          pageUrl={pageUrl}
          username={username}
          currentIndex={currentIndex}
          handleStopTask={stopTask}
          setCurrentIndex={setCurrentIndex}
          setOpenPurchase={setOpenPurchase}
          setOpenAlert={setOpenAlert}
        />
      )}
      {currentPage === "OtherSellerCard" && (
        <OtherSellerCard
          settings={settings}
          cookies={cookiesString}
          pageUrl={pageUrl}
          username={username}
          currentIndex={currentIndex}
          handleStopTask={stopTask}
          setCurrentIndex={setCurrentIndex}
          setOpenPurchase={setOpenPurchase}
          setOpenAlert={setOpenAlert}
        />
      )}
      {currentPage === "BlankCard" && <BlankCard />}
      {/* {currentPage === "MiscCard" && (
        <MiscCard
          settings={settings}
          cookies={cookiesString}
          pageUrl={pageUrl}
        />
      )} */}
      <PurchaseModal
        handleClose={() => handleClose("purchase")}
        open={openPurchase}
        title={"Uh Oh! Out of Task Tokens?"}
        outOfTaskTokens={true}
      />
      <ActionModal open={openAlert} handleClose={() => handleClose("alert")} />
    </section>
  );
};

export default HomeCard;

const UserCard: React.FC<
  CardProps & {
    cookies: string;
    username: string;
    pageUrl: string;
    currentIndex: string;
    handleStopTask: (task: string) => void;
    setCurrentIndex: (index: string) => void;
    setOpenPurchase: (action: boolean) => void;
    setOpenAlert: (action: boolean) => void;
  }
> = ({
  settings,
  setCurrentIndex,
  handleStopTask,
  cookies,
  username,
  pageUrl,
  currentIndex,
  setOpenPurchase,
  setOpenAlert,
}) => {
  const delay = settings.delay || 10;
  const discountPercentage = settings.percentage || 0;
  const unfollow_exclusion = settings.unfollowExpectionList || [];
  const follow_exclusion = settings.followExpectionList || [];
  const bumpFromBottom = settings.bumpFromBottom || false;
  const storedTaskTokens = useSelector((state: any) => state.user.taskTokens);
  const uid = useSelector((state: any) => state.user.uid);
  const email = useSelector((state: any) => state.user.email);
  const membership = useSelector((state: any) => state.user.membership);

  const { setActiveAction, activeAction } = useContext(MenuActionContext);

  const stepNumber = currentIndex.split("/")[0];
  const completeNumber = parseInt(currentIndex.split("/")[1]);

  const handleButtonClick = (newAction: string) => {
    if (newAction === "follow-buyers" && membership == "basic") {
      alert("You need to upgrade your membership to use this feature.");
      return;
    }
    const reviewXPath =
      "//button[@data-testid='buttonLink']//p[contains(text(), '(')]";
    const reviewElement = document.evaluate(
      reviewXPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    // Extract the review number from the text content of the paragraph element, removing any parentheses
    const reviewNumber = reviewElement
      ? reviewElement?.textContent?.replace(/[()]/g, "").trim()
      : "Not found";

    // XPath to find the follower count element
    const followersXPath =
      "//button[span[contains(text(), 'Followers')]]/span[@class='_text_bevez_41 _shared_bevez_6 _bold_bevez_47']";
    const followersElement = document.evaluate(
      followersXPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    const userFollowerCount = followersElement
      ? followersElement.textContent?.trim()
      : "Not found";

    // XPath to find the following count element
    const followingXPath =
      "//button[span[contains(text(), 'Following')]]/span[@class='_text_bevez_41 _shared_bevez_6 _bold_bevez_47']";
    const followingElement = document.evaluate(
      followingXPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    const userFollowingCount = followingElement
      ? followingElement.textContent?.trim()
      : "Not found";

    if (
      (reviewNumber === "0" || reviewNumber === "Not Found") &&
      newAction === "follow-buyers"
    ) {
      alert("Can't run this action, There's no buyers. (Refesh the page)");
      return;
    }

    if (
      (userFollowerCount === "Not found" || userFollowerCount == "0") &&
      newAction == "follow-followers"
    ) {
      alert("No users to follow. (Refesh the page)");
      return;
    }

    if (
      (userFollowingCount === "Not found" || userFollowingCount == "0") &&
      (newAction == "follow-following" || newAction == "unfollow-users")
    ) {
      alert("No users to follow/unfollow. (Refesh the page)");
      return;
    }

    if (storedTaskTokens == 0 && !activeAction) {
      alert("You have no task tokens left. (Refesh the page)");
      setOpenPurchase(true);
      return;
    }

    if (activeAction === newAction) {
      handleStopTask(newAction);
    } else {
      if (activeAction) {
        handleStopTask(activeAction);
      }
      setCurrentIndex("0/0");
      setActiveAction(newAction);

      // Trigger task execution
      handleActionEvent(
        newAction,
        delay,
        discountPercentage,
        bumpFromBottom,
        username,
        uid,
        cookies,
        pageUrl,
        setActiveAction,
        setOpenAlert,
        newAction.includes("follow") ? follow_exclusion : unfollow_exclusion
      );
    }
  };

  return (
    <div className="flex flex-col h-72 bg-mainGray items-center px-4 py-1 space-y-1 transition duration-300 ">
      <button
        onClick={() => handleButtonClick("bump-listings")}
        className="flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        {activeAction === "bump-listings" ? "STOP BUMPING" : "BUMP LISTINGS"}
        {activeAction === "bump-listings" && (
          <div className="flex items-center flex-col">
            <ProgressBar
              bgColor="red"
              className="w-11/12"
              completed={stepNumber}
              maxCompleted={completeNumber}
            />
            <p className="text-xs ">{`Bumping... ${stepNumber}/${completeNumber} (Don't Refresh!)`}</p>
          </div>
        )}
      </button>

      <button
        onClick={() => handleButtonClick("follow-followers")}
        className="flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        {activeAction === "follow-followers"
          ? "STOP FOLLOWING"
          : "FOLLOW FOLLOWERS"}
        {activeAction === "follow-followers" && (
          <div className="flex items-center flex-col">
            <ProgressBar
              bgColor="red"
              className="w-11/12"
              completed={stepNumber}
              maxCompleted={completeNumber}
            />
            <p className="text-xs ">{`Following...  ${stepNumber}/${completeNumber} (Don't Refresh!)`}</p>
          </div>
        )}
      </button>
      <button
        onClick={() => handleButtonClick("unfollow-users")}
        className="flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        {activeAction === "unfollow-users"
          ? "STOP UNFOLLOWING USERS"
          : "UNFOLLOW USERS"}
        {activeAction === "unfollow-users" && (
          <div className="flex items-center flex-col">
            <ProgressBar
              bgColor="red"
              className="w-11/12"
              completed={stepNumber}
              maxCompleted={completeNumber}
            />
            <p className="text-xs ">{`Following...  ${stepNumber}/${completeNumber} (Don't Refresh!)`}</p>
          </div>
        )}
      </button>

      <button
        onClick={() => handleButtonClick("bulk-unlike")}
        className="flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        {activeAction === "bulk-unlike" ? "STOP UNLIKING" : "BULK UNLIKE"}
        {activeAction === "bulk-unlike" && (
          <div className="flex items-center flex-col">
            <ProgressBar
              bgColor="red"
              className="w-11/12"
              completed={stepNumber}
              maxCompleted={completeNumber}
            />
            <p className="text-xs ">{`Liking ${stepNumber}/${completeNumber} (Don't Refresh!)`}</p>
          </div>
        )}
      </button>
      <button
        onClick={() => handleButtonClick("follow-buyers")}
        className="flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        {activeAction === "follow-buyers"
          ? "STOP FOLLOWING BUYERS"
          : membership == "basic"
          ? "FOLLOW BUYERS 🔒"
          : "FOLLOW BUYERS"}
        {activeAction === "follow-buyers" && (
          <div className="flex items-center flex-col">
            <ProgressBar
              bgColor="red"
              className="w-11/12"
              completed={stepNumber}
              maxCompleted={completeNumber}
            />
            <p className="text-xs ">{`Following...  ${stepNumber}/${completeNumber} (Don't Refresh!)`}</p>
          </div>
        )}
      </button>
    </div>
  );
};

const OtherSellerCard: React.FC<
  CardProps & {
    cookies: string;
    username: string;
    pageUrl: string;
    currentIndex: string;
    handleStopTask: (task: string) => void;
    setCurrentIndex: (index: string) => void;
    setOpenPurchase: (action: boolean) => void;
    setOpenAlert: (action: boolean) => void;
  }
> = ({
  settings,
  setCurrentIndex,
  handleStopTask,
  cookies,
  username,
  pageUrl,
  currentIndex,
  setOpenPurchase,
  setOpenAlert,
}) => {
  const delay = settings.delay || 10;
  const discountPercentage = settings.percentage || 0;
  const unfollow_exclusion = settings.unfollowExpectionList || [];
  const follow_exclusion = settings.followExpectionList || [];
  const bumpFromBottom = settings.bumpFromBottom || false;
  const storedTaskTokens = useSelector((state: any) => state.user.taskTokens);
  const uid = useSelector((state: any) => state.user.uid);
  const email = useSelector((state: any) => state.user.email);
  const membership = useSelector((state: any) => state.user.membership);

  const { setActiveAction, activeAction } = useContext(MenuActionContext);

  const stepNumber = currentIndex.split("/")[0];
  const completeNumber = parseInt(currentIndex.split("/")[1]);

  const handleButtonClick = (newAction: string) => {
    if (newAction === "follow-buyers" && membership == "basic") {
      alert("You need to upgrade your membership to use this feature.");
      return;
    }

    const reviewXPath =
      "//button[@data-testid='buttonLink']//p[contains(text(), '(')]";
    const reviewElement = document.evaluate(
      reviewXPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    // Extract the review number from the text content of the paragraph element, removing any parentheses
    const reviewNumber = reviewElement
      ? reviewElement?.textContent?.replace(/[()]/g, "").trim()
      : "Not found";

    // XPath to find the follower count element
    const followersXPath =
      "//button[span[contains(text(), 'Followers')]]/span[@class='_text_bevez_41 _shared_bevez_6 _bold_bevez_47']";
    const followersElement = document.evaluate(
      followersXPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    const userFollowerCount = followersElement
      ? followersElement.textContent?.trim()
      : "Not found";

    // XPath to find the following count element
    const followingXPath =
      "//button[span[contains(text(), 'Following')]]/span[@class='_text_bevez_41 _shared_bevez_6 _bold_bevez_47']";
    const followingElement = document.evaluate(
      followingXPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    const userFollowingCount = followingElement
      ? followingElement.textContent?.trim()
      : "Not found";

    if (
      (reviewNumber === "0" || reviewNumber === "Not Found") &&
      newAction === "follow-buyers"
    ) {
      alert(
        "You have no reviews. Please get some reviews before following buyers. (Refesh the page)"
      );
      return;
    }

    if (
      (userFollowerCount === "Not found" || userFollowerCount == "0") &&
      newAction == "follow-followers"
    ) {
      alert("No users to follow. (Refesh the page)");
      return;
    }

    if (
      (userFollowingCount === "Not found" || userFollowingCount == "0") &&
      (newAction == "follow-following" || newAction == "unfollow-users")
    ) {
      alert("No users to follow/unfollow. (Refesh the page)");
      return;
    }

    if (storedTaskTokens == 0 && !activeAction) {
      alert("You have no task tokens left. (Refesh the page)");
      setOpenPurchase(true);
      return;
    }

    if (activeAction === newAction) {
      handleStopTask(newAction);
    } else {
      if (activeAction) {
        handleStopTask(activeAction);
      }
      setCurrentIndex("0/0");
      setActiveAction(newAction);

      // Trigger task execution
      handleActionEvent(
        newAction,
        delay,
        discountPercentage,
        bumpFromBottom,
        username,
        uid,
        cookies,
        pageUrl,
        setActiveAction,
        setOpenAlert,
        newAction.includes("follow") ? follow_exclusion : unfollow_exclusion
      );
    }
  };

  return (
    <div className="flex flex-col h-72 bg-mainGray items-center px-4 py-1 space-y-1 transition duration-300 ">
      <button
        onClick={() => handleButtonClick("follow-followers")}
        className="flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        {activeAction === "follow-followers"
          ? "STOP FOLLOWING"
          : "FOLLOW FOLLOWERS"}
        {activeAction === "follow-followers" && (
          <div className="flex items-center flex-col">
            <ProgressBar
              bgColor="red"
              className="w-11/12"
              completed={stepNumber}
              maxCompleted={completeNumber}
            />
            <p className="text-xs ">{`Following...  ${stepNumber}/${completeNumber} (Don't Refresh!)`}</p>
          </div>
        )}
      </button>
      <button
        onClick={() => handleButtonClick("follow-following")}
        className="flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        {activeAction === "follow-following"
          ? "STOP FOLLOWING"
          : "FOLLOW FOLLOWING"}
        {activeAction === "follow-following" && (
          <div className="flex items-center flex-col">
            <ProgressBar
              bgColor="red"
              className="w-11/12"
              completed={stepNumber}
              maxCompleted={completeNumber}
            />
            <p className="text-xs ">{`Following... ${stepNumber}/${completeNumber} (Don't Refresh!)`}</p>
          </div>
        )}
      </button>

      <button
        onClick={() => handleButtonClick("like-items")}
        className="flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300 "
      >
        {activeAction === "like-items" ? "STOP LIKING" : "LIKE ITEMS"}
        {activeAction === "like-items" && (
          <div className="flex items-center flex-col">
            <ProgressBar
              bgColor="red"
              className="w-11/12"
              completed={stepNumber}
              maxCompleted={completeNumber}
            />
            <p className="text-xs ">{`Liking... ${stepNumber}/${completeNumber} (Don't Refresh!)`}</p>
          </div>
        )}
      </button>

      <button
        onClick={() => handleButtonClick("follow-buyers")}
        className="flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        {activeAction === "follow-buyers"
          ? "STOP FOLLOWING BUYERS"
          : membership == "basic"
          ? "FOLLOW BUYERS 🔒"
          : "FOLLOW BUYERS"}
        {activeAction === "follow-buyers" && (
          <div className="flex items-center flex-col">
            <ProgressBar
              bgColor="red"
              className="w-11/12"
              completed={stepNumber}
              maxCompleted={completeNumber}
            />
            <p className="text-xs ">{`Following...  ${stepNumber}/${completeNumber} (Don't Refresh!)`}</p>
          </div>
        )}
      </button>
    </div>
  );
};

// Coming soon V2
// const MiscCard: React.FC<CardProps & { cookies: string; pageUrl: string }> = ({
//   settings,
//   cookies,
//   pageUrl,
// }) => {
//   const uid = useSelector((state: any) => state.user.uid);
//   const membership = useSelector((state: any) => state.user.membership);
//   const delay = settings.delay || 10;
//   const discountPercentage = settings.percentage || 0;
//   const unfollow_exclusion = settings.unfollowExpectionList || [];
//   const follow_exclusion = settings.followExpectionList || [];
//   const bumpFromBottom = settings.bumpFromBottom || false;
//   const [currentIndex, setCurrentIndex] = useState("0/0"); // Assuming initial state
//   const [currentImage, setCurrentImage] = useState(
//     "/public/blankImageIcon.png"
//   );

//   const { setActiveAction, activeAction } = useContext(ActionMenuContext);
//   const stepNumber = currentIndex.split("/")[0];
//   const completeNumber = parseInt(currentIndex.split("/")[1]);
//   const storedTaskTokens = useSelector((state: any) => state.user.taskTokens);

//   return (
//     <div className='flex flex-col h-72 bg-mainGray items-center justify-center p-4 space-y-4  hover:bg-opacity-80 transition duration-300'>
//       <button
//         onClick={() =>
//           handleActionEvent(
//             "send-offers",
//             delay,
//             discountPercentage,
//             settings.bumpFromBottom,
//             uid,
//             cookies,
//             membership,
//             pageUrl,
//             setActiveAction,
//             storedTaskTokens
//           )
//         }
//         className='flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-80 transition duration-300'
//       >
//         {activeAction === "send-offers" ? "STOP SENDING OFFERS" : "SEND OFFERS"}
//       </button>
//       <button
//         onClick={() =>
//           handleActionEvent(
//             "like-suggested",
//             delay,
//             discountPercentage,
//             settings.bumpFromBottom,
//             uid,
//             cookies,
//             membership,
//             pageUrl,
//             setActiveAction,
//             storedTaskTokens
//           )
//         }
//         className='flex-grow text-lg italic font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-80 transition duration-300'
//       >
//         {activeAction === "like-suggested" ? "STOP LIKING" : "LIKE SUGGESTED"}
//         {activeAction === "like-suggested" && (
//           <>
//             <ProgressBar
//               bgColor='red'
//               // completed={currentIndex.split("/")[0]}
//               completed={stepNumber}
//               maxCompleted={completeNumber}
//             />

//             <p className='text-xs '>
//               {`Liking ${stepNumber}/${completeNumber}`}
//             </p>
//           </>
//         )}
//       </button>
//     </div>
//   );
// };

const BlankCard = () => {
  const handleClick = () => {
    alert(
      `
      🚀 Exciting Features Coming Soon! 🚀
    
      Get ready to supercharge your experience with brand-new actions like:
      ✨ Sending Offers
      ❤️ Liking Suggested Items
      and Much More!
    
      Meanwhile, head over to your profile or a seller's profile to enjoy the available actions.
    
      Stay tuned for more updates! 🌟
    `
    );
  };
  return (
    <div className="flex flex-col h-72 bg-mainGray items-center px-4 py-1 space-y-1 transition duration-300 ">
      <button
        onClick={handleClick}
        className="flex-grow text-lg italic bg-opacity-40 font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        SEND OFFERS 🔒
      </button>

      <button
        onClick={handleClick}
        className="flex-grow text-lg italic bg-opacity-40 font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        LIKE SUGGESTED <br></br> ITEMS 🔒
      </button>

      <button
        onClick={handleClick}
        className="flex-grow text-lg italic bg-opacity-40 font-medium text-white bg-mainRed rounded-md shadow-sm w-full hover:bg-opacity-20 transition duration-300"
      >
        SEND MESSAGE 🔒
      </button>
    </div>
  );
};
