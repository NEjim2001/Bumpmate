import React, { useContext, useEffect } from "react";
import { useState } from "react";
import HomeCard from "./HomeCard";
import ProfileCard from "./ProfileCard";
import SettingsCard from "./SettingsCard";
import { UserIcon, HomeIcon, Cog6ToothIcon } from "@heroicons/react/24/solid";
import { useDispatch, useSelector } from "react-redux";
import "./style.css";
import { setMembership, setUser } from "../redux/slices/user";
import {
  getDocs,
  query as firebaseQuery,
  where,
  collection,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { MenuActionContext } from "../context/MenuActionProvider";
interface MenuProps {
  onClick: () => void;
}

const Menu: React.FC<MenuProps> = ({ onClick }) => {
  const storedUser = useSelector((state: any) => state.user);
  const [current, setCurrent] = useState(0);
  const dispatch = useDispatch();
  const { activeAction } = useContext(MenuActionContext);
  const iconUrl = chrome?.runtime
    ? chrome?.runtime?.getURL("iconTransparent.png")
    : "/iconTransparent.png";

  const handleSetPage = (level: number) => {
    if (storedUser.uid == "" && level != 0)
      return alert("Please sign in to access this feature");

    if (activeAction != "") {
      setCurrent(1);
      return alert("Please end the current action before proceeding");
    }
    setCurrent(level);
  };

  useEffect(() => {
    const fetchSubscriptionData = async (uid) => {
      if (!uid) return;

      const CACHE_EXPIRY = 24 * 60 * 60 * 1000;
      const now = Date.now();

      // Get the last fetch timestamp from localStorage
      const lastFetchTimestamp = localStorage.getItem("lft");

      // Determine if we need to fetch new data
      const shouldFetchData =
        !lastFetchTimestamp ||
        now - parseInt(lastFetchTimestamp, 10) >= CACHE_EXPIRY;

      if (shouldFetchData) {
        try {
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

          let tier = "basic"; // Default value if no subscription found
          if (!subscriptionSnapshot.empty) {
            const subscriptionDoc = subscriptionSnapshot.docs[0];
            const data = subscriptionDoc.data();
            tier = data.tier || "basic";
          }

          // Update membership status in Redux and localStorage
          dispatch(setMembership(tier));
          const userData = JSON.parse(localStorage.getItem("user") || "{}");
          if (userData.uid) {
            const updatedUser = {
              ...userData,
              membership: tier,
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
          }
          // Update the last fetch timestamp
          localStorage.setItem("lft", now.toString()); // Last fetch timestamp
        } catch (error) {
          console.error("Error fetching subscription data:", error);
        }
      }

      const cachedData = JSON.parse(localStorage.getItem("user") || "{}");
      dispatch(setUser(cachedData));
    };

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (userData && userData.uid) {
      fetchSubscriptionData(userData.uid);
    }
  }, []);

  return (
    <div className="w-72 h-full  flex flex-col justify-between  z-10 shadow-xl">
      <section
        className="flex-row flex bg-gradient-to-r from-mainRed to-secondaryRed items-center h-16 hover:cursor-pointer  rounded-t-md"
        onClick={onClick}
      >
        <img
          className="absolute h-14"
          src={iconUrl}
          alt="BumpMate Extension Logo"
        />
        <div className=" w-full  text-center text-xl font-bold text-white italic">
          BumpMate
        </div>
      </section>

      <section className="h-full bg-white">
        {!storedUser ? <ProfileCard /> : null}
        {storedUser && current == 0 && <ProfileCard />}
        {storedUser && current == 1 && <HomeCard />}
        {storedUser && current == 2 && <SettingsCard />}
      </section>

      <div className="flex justify-evenly items-center py-2 bg-gradient-to-r from-mainRed to-secondaryRed  rounded-b-md  ">
        <div
          className=" hover:cursor-pointer "
          onClick={() => {
            handleSetPage(0);
          }}
        >
          <UserIcon
            color={current == 0 ? "white" : "black"}
            className=" hover:cursor-pointer shrink-0 self-stretch my-auto aspect-square w-10 h-8 hover:animate-pulse"
          />
        </div>
        <div
          className="hover:cursor-pointer"
          onClick={() => {
            handleSetPage(1);
          }}
        >
          <HomeIcon
            color={current == 1 ? "white" : "black"}
            className="hover:cursor-pointer shrink-0 self-stretch my-auto aspect-square w-10 h-8 hover:animate-pulse"
          />
        </div>
        <div
          className=" hover:cursor-pointer "
          onClick={() => {
            handleSetPage(2);
          }}
        >
          <Cog6ToothIcon
            color={current == 2 ? "white" : "black"}
            className="hover:cursor-pointer shrink-0 self-stretch my-auto aspect-square w-10 h-8  hover:animate-pulse"
          />
        </div>
      </div>
    </div>
  );
};

export default Menu;
