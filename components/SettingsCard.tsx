import React, { useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import Switch from "react-switch";
import { TextField, Button } from "@mui/material";
import { Tooltip } from "react-tooltip";
import "./style.css";

// Get initial settings from localStorage
const getInitialSettings = () => {
  const storedSettings = localStorage.getItem("bumpSettings");
  if (storedSettings) {
    return JSON.parse(storedSettings);
  }
  return {
    delay: 9,
    discountPercentage: 0,
    bumpFromBottom: false,
    unfollowExpectionList: [],
    followExpectionList: [],
  };
};

// Load presets from localStorage
const getPresets = () => {
  const storedPresets = localStorage.getItem("settingsPresets");
  if (storedPresets) {
    return JSON.parse(storedPresets);
  }
  return {};
};

function SettingsCard() {
  const initialSettings = getInitialSettings();
  const [delay, setDelay] = useState(initialSettings.delay);
  const [discountPercentage, setDiscountPercentage] = useState(
    initialSettings.discountPercentage
  );
  const [taskLimit, setTaskLimit] = useState(initialSettings.taskLimit || 0);
  const [bumpFromBottom, setBumpFromBottom] = useState(
    initialSettings.bumpFromBottom
  );
  const [unfollowExpectionList, setUnfollowExpectionList] = useState<string[]>(
    initialSettings.unfollowExpectionList
  );
  const [followExpectionList, setFollowExpectionList] = useState<string[]>(
    initialSettings.followExpectionList
  );
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState(getPresets());

  // Save current settings to localStorage
  const saveSettings = (settings: any) => {
    localStorage.setItem("bumpSettings", JSON.stringify(settings));
  };

  // Handle slider change
  const handleSliderChange = (value: number, type: string) => {
    const newSettings = {
      delay,
      discountPercentage,
      taskLimit,
      bumpFromBottom,
      followExpectionList,
      unfollowExpectionList,
    };
    if (type === "delay") {
      setDelay(value);
      newSettings.delay = value;
    } else if (type === "taskLimit") {
      setTaskLimit(value);
      newSettings.taskLimit = value;
    } else {
      setDiscountPercentage(value);
      newSettings.discountPercentage = value;
    }
    saveSettings(newSettings);
  };

  // Handle bump from bottom toggle
  const handleBumpFromBottomChange = (checked: boolean) => {
    setBumpFromBottom(checked);
    saveSettings({
      delay,
      discountPercentage,
      taskLimit,
      bumpFromBottom: checked,
      followExpectionList,
      unfollowExpectionList,
    });
  };

  // Handle text input changes for lists
  const textInputHandler = (
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
    type: string
  ) => {
    const { value } = event.target;
    let newFollowExpectionList = followExpectionList;
    let newUnfollowExpectionList = unfollowExpectionList;

    if (value.trim() === "") {
      if (type === "unfollow") {
        newUnfollowExpectionList = [];
        setUnfollowExpectionList(newUnfollowExpectionList);
      } else if (type === "follow") {
        newFollowExpectionList = [];
        setFollowExpectionList(newFollowExpectionList);
      }
    } else {
      const usernames = value.split(",").map((username) => username.trim());
      if (type === "unfollow") {
        newUnfollowExpectionList = usernames;
        setUnfollowExpectionList(newUnfollowExpectionList);
      } else if (type === "follow") {
        newFollowExpectionList = usernames;
        setFollowExpectionList(newFollowExpectionList);
      }
    }

    saveSettings({
      delay,
      discountPercentage,
      taskLimit,
      bumpFromBottom,
      followExpectionList: newFollowExpectionList,
      unfollowExpectionList: newUnfollowExpectionList,
    });
  };

  // Save current settings as a new preset
  const savePreset = () => {
    if (presetName.trim()) {
      const newPresets = {
        ...presets,
        [presetName]: {
          delay,
          discountPercentage,
          taskLimit,
          bumpFromBottom,
          followExpectionList,
          unfollowExpectionList,
        },
      };
      setPresets(newPresets);
      localStorage.setItem("settingsPresets", JSON.stringify(newPresets));
      setPresetName("");
    }
  };

  // Load a saved preset into current settings
  const loadPreset = (name: string) => {
    const preset = presets[name];
    if (preset) {
      setDelay(preset.delay);
      setDiscountPercentage(preset.discountPercentage);
      setTaskLimit(preset.taskLimit);
      setBumpFromBottom(preset.bumpFromBottom);
      setFollowExpectionList(preset.followExpectionList);
      setUnfollowExpectionList(preset.unfollowExpectionList);
    }
  };

  // Delete a saved preset
  const deletePreset = (name: string) => {
    const newPresets = { ...presets };
    delete newPresets[name];
    setPresets(newPresets);
    localStorage.setItem("settingsPresets", JSON.stringify(newPresets));
  };

  return (
    <div className="shadow-xl w-72 h-full flex justify-evenly flex-col px-4">
      <div className="flex-col flex px-3 text-xl font-semibold">
        <div className="w-1/2 text-mainRed italic bg-clip-text">SETTINGS</div>
        <div className="w-[100px] bg-mainRed rounded-lg min-h-[4px]" />
      </div>
      <div className="flex flex-col h-72 overflow-y-auto bg-mainGray px-4 text-mainRed pt-2 pb-6 space-y-8">
        <section className="flex flex-col items-center">
          <div className="italic text-xs bg-clip-text font-bold">
            Bump Settings
          </div>
          <div className="flex flex-row justify-between w-full text-sm italic font-medium bg-clip-text m-2">
            <span
              data-tooltip-id="bump-speed-tooltip"
              data-tooltip-content="The time between each item bump. (Recommended: 10 - 15 seconds)"
              className="cursor-default"
            >
              <Tooltip id="bump-speed-tooltip" />
              Bump Speed
            </span>
            <span>{delay} seconds</span>
          </div>
          <Slider
            className="z-0"
            styles={{
              handle: {
                backgroundColor: "red",
                borderColor: "red",
              },
              track: {
                backgroundColor: "red",
                height: 5,
              },
            }}
            onChange={(value) => handleSliderChange(Number(value), "delay")}
            max={20}
            min={5}
            value={delay}
            pushable={false}
          />
          <div className="flex flex-row justify-between w-full mt-3.5 text-sm italic font-medium bg-clip-text">
            <span
              data-tooltip-id="bump-from-bottom-tooltip"
              data-tooltip-content="Bumps items from the bottom of the list instead of the top."
              className="cursor-default"
            >
              <Tooltip id="bump-from-bottom-tooltip" />
              Bump from Bottom
            </span>
            <Switch
              height={20}
              width={40}
              onChange={handleBumpFromBottomChange}
              checked={bumpFromBottom}
            />
          </div>
        </section>

        <section className="flex flex-col items-center  pt-4 border-t border-black border-opacity-5">
          <div className="italic text-xs bg-clip-text font-bold">
            Follow Settings
          </div>
          <div className="flex flex-col justify-between w-full text-sm italic font-medium bg-clip-text m-2 mt-4 space-y-2">
            <span
              data-tooltip-id="follow-exception-tooltip"
              data-tooltip-content="Follows everyone except these users. (Leave blank to follow anyone)"
              className="cursor-default"
            >
              <Tooltip id="follow-exception-tooltip" />
              Follow Exception List
            </span>
            <TextField
              id="follow-exception-list"
              label="User1,User2,User3"
              variant="outlined"
              multiline
              className="bg-white rounded-md"
              onChange={(event) => textInputHandler(event, "follow")}
              value={followExpectionList.join(",")}
            />
          </div>
          <div className="flex flex-col justify-between w-full text-sm italic font-medium bg-clip-text m-2 mt-4 space-y-2">
            <span
              data-tooltip-id="unfollow-exception-tooltip"
              data-tooltip-content="Unfollows everyone except these users. (Leave blank to unfollow everyone)"
              className="cursor-default"
            >
              <Tooltip id="unfollow-exception-tooltip" />
              Unfollow Exception List
            </span>
            <TextField
              id="unfollow-exception-list"
              label="User1,User2, User3"
              variant="outlined"
              multiline
              className="bg-white rounded-md"
              onChange={(event) => textInputHandler(event, "unfollow")}
              value={unfollowExpectionList.join(",")}
            />
          </div>
        </section>

        <section className="flex flex-col items-center  py-4 border-t border-black border-opacity-5">
          <div className="italic text-xs bg-clip-text font-bold">
            Task Settings
          </div>
          <div className="flex flex-row justify-between w-full text-sm italic font-medium bg-clip-text m-2">
            <span
              data-tooltip-id="task-limit-tooltip"
              data-tooltip-content="Limits the number of tasks ran per action. (0 for unlimited)"
              className="cursor-default"
            >
              <Tooltip id="task-limit-tooltip" />
              Task Limit
            </span>
            <span>{taskLimit} Task</span>
          </div>
          <Slider
            className="z-0"
            styles={{
              handle: {
                backgroundColor: "red",
                borderColor: "red",
              },
              track: {
                backgroundColor: "red",
                height: 5,
              },
            }}
            onChange={(value) => handleSliderChange(Number(value), "taskLimit")}
            max={100}
            step={5}
            min={0}
            value={taskLimit}
            pushable={false}
          />
        </section>

        {/* Preset Management Section */}
        <section className="flex flex-col items-center py-4 border-t border-black border-opacity-5">
          <div className="italic text-xs bg-clip-text font-bold">Other</div>
          <div className="flex flex-row justify-between w-full text-sm italic font-medium bg-clip-text m-2">
            <span
              data-tooltip-id="presents-tooltip"
              data-tooltip-content="Save and load presets for your settings."
              className="cursor-default"
            >
              <Tooltip id="presents-tooltip" />
              Save Presets
            </span>
          </div>
          <div className="flex flex-col w-full text-sm italic font-medium bg-clip-text m-2 mt-4 space-y-2">
            <TextField
              id="preset-name"
              label="Preset Name"
              variant="outlined"
              value={presetName}
              className="bg-white rounded-md"
              onChange={(e) => setPresetName(e.target.value)}
            />

            <Button
              variant="contained"
              color="secondary"
              onClick={savePreset}
              disabled={!presetName.trim()}
            >
              Save Preset
            </Button>
            {Object.keys(presets).length > 0 && (
              <div className="flex flex-col mt-4">
                <div className="text-sm italic font-medium bg-clip-text">
                  Saved Presets
                </div>
                {Object.keys(presets).map((preset) => (
                  <div
                    key={preset}
                    className="flex flex-row justify-between items-center w-full mt-2"
                  >
                    <span className="w-1/3 text-xs truncate">{preset}</span>
                    <div>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => loadPreset(preset)}
                        disabled={presetName === preset}
                        className="w-1/2"
                      >
                        Load
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => deletePreset(preset)}
                        className="w-1/2"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsCard;
