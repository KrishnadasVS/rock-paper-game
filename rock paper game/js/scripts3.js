// Import Firebase functions
import { db, updateUserScore, getUserData } from "./auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Enable offline persistence
import { enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == "failed-precondition") {
    console.log("Offline persistence can only be enabled in one tab");
  } else if (err.code == "unimplemented") {
    console.log("Browser doesn't support offline persistence");
  }
});

// Game Constants
const SCORE_LIMIT = 5;
const GAME_CHOICES = ["Paper", "Scissors", "Rock"];

// DOM Elements
const rulesElement = document.querySelector(".container__rules");
const playerScoreElement = document.querySelector(".header__scoreNumber");
const computerScoreElement = document.querySelector(
  ".header__computerScoreNumber"
);
const modalElement = document.querySelector(".modal");
const modalOverlayElement = document.querySelector(".modal__overlay");
const closeElement = document.querySelector(".modal__closeIcon");
const gameContentElement = document.querySelector(".gameContent");
const gameChoiceElements = document.querySelectorAll(
  ".gameContent__gameChoice"
);
const gameChoiceComputerElement = document.querySelector(
  ".gameContent__gameChoice--isComputer"
);
const countdownTextElement = document.querySelector(
  ".gameContent__countdownText"
);
const resultButtonElement = document.querySelector(
  ".gameContent__resultButton"
);
const resultTextElement = document.querySelector(".gameContent__resultText");
const player = document.querySelector("lottie-player");
const ruleChangeTimerElement = document.getElementById("ruleChangeTimer");
const ruleChangeNotification = document.getElementById(
  "ruleChangeNotification"
);

// Game State
let countdown = 3;
let randomResult;
let isGameActive = false;
let playerScore = 0;
let computerScore = 0;
let isEasyMode = true;
let gameTime = 0;
let ruleChangeInterval = null;
let modeSwitchInterval = null;

// Sound Effects
const clickSound = new Audio("sounds/click.wav");

// Game Functions
const playClickSound = () => {
  try {
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play().catch((e) => console.log("Audio play failed:", e));
    }
  } catch (error) {
    console.error("Sound error:", error);
  }
};

const rulesModalEvent = () => {
  playClickSound();
  if (modalElement) {
    modalElement.classList.toggle("modal--isActive");
  }
};

const getRandomNumber = () => Math.floor(Math.random() * 3);

const resetGameUI = () => {
  if (!gameContentElement) return;

  gameContentElement.classList.remove(
    "gameContent--revealResult",
    "gameContent--isActive",
    "gameContent--isLost",
    "gameContent--winGlow",
    "gameContent--drawEffect",
    "gameContent--shake"
  );

  if (gameChoiceComputerElement) {
    gameChoiceComputerElement.className =
      "gameContent__gameChoice gameContent__gameChoice--isComputer";
    const gameChoiceImageElement = gameChoiceComputerElement.querySelector(
      ".gameContent__gameChoiceImage"
    );
    if (gameChoiceImageElement) {
      gameChoiceImageElement.setAttribute("src", "");
    }
  }

  document
    .querySelectorAll(".gameContent__gameChoice--isActive")
    .forEach((el) => {
      el.classList.remove("gameContent__gameChoice--isActive");
    });

  if (countdownTextElement) countdownTextElement.textContent = "";
  if (resultTextElement) resultTextElement.textContent = "";
};

const resetScores = () => {
  playerScore = 0;
  computerScore = 0;
  if (playerScoreElement) playerScoreElement.textContent = "0";
  if (computerScoreElement) computerScoreElement.textContent = "0";
};

const showRuleChangeNotification = () => {
  if (!ruleChangeNotification) return;

  const modeText = isEasyMode ? "NORMAL MODE" : "REVERSED RULE";
  const modeColor = isEasyMode ? "#2ecc71" : "#e74c3c";

  ruleChangeNotification.innerHTML = `
    <h2 style="color: ${modeColor}">${modeText}</h2>
    <p>Rules have changed!</p>
  `;

  ruleChangeNotification.style.display = "block";
  ruleChangeNotification.style.opacity = "1";
  ruleChangeNotification.style.top = "20px";
  ruleChangeNotification.style.left = "20px";
  ruleChangeNotification.style.transform = "none";

  setTimeout(() => {
    ruleChangeNotification.style.opacity = "0";
    setTimeout(() => {
      ruleChangeNotification.style.display = "none";
    }, 1000);
  }, 2000);
};

const checkWinCondition = (userChoice, computerChoice) => {
  if (isEasyMode) {
    // Easy mode: Traditional rules
    return (
      (userChoice === "Paper" && computerChoice === "Scissors") ||
      (userChoice === "Scissors" && computerChoice === "Rock") ||
      (userChoice === "Rock" && computerChoice === "Paper")
    );
  } else {
    // Hard mode: Reversed rules
    return (
      (userChoice === "Rock" && computerChoice === "Scissors") ||
      (userChoice === "Paper" && computerChoice === "Rock") ||
      (userChoice === "Scissors" && computerChoice === "Paper")
    );
  }
};

// [Previous imports and constants remain exactly the same...]

const updateModeDisplay = () => {
  if (!ruleChangeTimerElement) return;

  const modeText = isEasyMode ? "NORMAL" : "REVERSED";
  const modeColor = isEasyMode ? "#2ecc71" : "#e74c3c";

  ruleChangeTimerElement.textContent = `${modeText} MODE`;
  ruleChangeTimerElement.style.color = modeColor;
  ruleChangeTimerElement.style.fontWeight = "bold";

  // Update the bottom display
  const modeDisplay = document.getElementById("currentModeDisplay");
  if (modeDisplay) {
    modeDisplay.textContent = `${modeText} MODE`;
    modeDisplay.style.color = modeColor;
    modeDisplay.style.backgroundColor = isEasyMode
      ? "rgba(46, 204, 113, 0.2)"
      : "rgba(231, 76, 60, 0.2)";
    modeDisplay.style.border = `2px solid ${modeColor}`;
  }

  // Clear any existing countdown
  if (ruleChangeInterval) {
    clearInterval(ruleChangeInterval);
    ruleChangeInterval = null;
  }

  // Start countdown after showing mode for 2 seconds
  setTimeout(() => {
    startRuleChangeTimer();
  }, 2000);
};

const startModeSwitching = () => {
  // Clear existing intervals
  if (modeSwitchInterval) clearInterval(modeSwitchInterval);
  if (ruleChangeInterval) clearInterval(ruleChangeInterval);

  // Initial mode setup
  isEasyMode = true;
  updateModeDisplay();
  showRuleChangeNotification();

  // Set interval to match the 15s countdown + 2s mode display
  modeSwitchInterval = setInterval(() => {
    isEasyMode = !isEasyMode;
    updateModeDisplay();
    showRuleChangeNotification();
  }, 17000); // 15s countdown + 2s mode display
};

const startRuleChangeTimer = () => {
  if (!ruleChangeTimerElement) return;

  // Clear any existing timer
  if (ruleChangeInterval) {
    clearInterval(ruleChangeInterval);
  }

  let timeLeft = 15;
  ruleChangeTimerElement.textContent = timeLeft;
  ruleChangeTimerElement.style.color = ""; // Reset to default color

  ruleChangeInterval = setInterval(() => {
    timeLeft--;
    ruleChangeTimerElement.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(ruleChangeInterval);
      ruleChangeInterval = null;
    }
  }, 1000);
};

// [All remaining code stays exactly the same...]
const showResult = async (userChoice, computerChoice) => {
  const userId = localStorage.getItem("userId");

  // Clear previous state
  if (gameContentElement) {
    gameContentElement.classList.remove(
      "gameContent--isLost",
      "gameContent--winGlow",
      "gameContent--drawEffect",
      "gameContent--shake"
    );
  }

  if (userChoice === computerChoice) {
    // Draw case - no score changes
    if (resultTextElement) resultTextElement.textContent = "Draw";
    if (player) {
      player.setAttribute(
        "src",
        "https://assets10.lottiefiles.com/packages/lf20_fhyjgb.json"
      );
    }
    if (gameContentElement) {
      gameContentElement.classList.add("gameContent--drawEffect");
      setTimeout(
        () => gameContentElement.classList.remove("gameContent--drawEffect"),
        800
      );
    }
  } else if (checkWinCondition(userChoice, computerChoice)) {
    // Computer wins case
    if (resultTextElement) resultTextElement.textContent = "You lose";
    if (gameContentElement) {
      gameContentElement.classList.add(
        "gameContent--isLost",
        "gameContent--shake"
      );
    }
    if (player) {
      player.stop();
      player.setAttribute(
        "src",
        "https://assets10.lottiefiles.com/packages/lf20_txs2jb.json"
      );
      player.play();
    }

    // Score handling - computer gains 1 point and user loses 1 point (if user has points)
    computerScore++;
    if (playerScore > 0) {
      playerScore--;
    }

    if (computerScoreElement) computerScoreElement.textContent = computerScore;
    if (playerScoreElement) playerScoreElement.textContent = playerScore;

    if (computerScore >= SCORE_LIMIT) {
      clearInterval(modeSwitchInterval);
      setTimeout(() => {
        alert(
          isEasyMode
            ? `You Lost!! Computer won with score ${SCORE_LIMIT}!`
            : "❌ Oops! You lost the game!"
        );
        resetScores();
        if (userId) updateUserScore(userId, 0).catch(console.error);
        startModeSwitching();
      }, 500);
    }
  } else {
    // Player wins case
    if (resultTextElement) resultTextElement.textContent = "You win";
    if (player) {
      player.stop();
      player.setAttribute(
        "src",
        "https://assets10.lottiefiles.com/packages/lf20_aEFaHc.json"
      );
      player.play();
    }
    if (gameContentElement)
      gameContentElement.classList.add("gameContent--winGlow");

    // Score handling - player gains 1 point and computer loses 1 point (if computer has points)
    playerScore++;
    if (computerScore > 0) {
      computerScore--;
    }

    if (playerScoreElement) playerScoreElement.textContent = playerScore;
    if (computerScoreElement) computerScoreElement.textContent = computerScore;

    if (playerScore >= SCORE_LIMIT) {
      clearInterval(modeSwitchInterval);
      setTimeout(() => {
        alert(
          isEasyMode
            ? `🎉 Congratulations! You reached ${SCORE_LIMIT} points!`
            : "🎉 Congratulations! You won the game!"
        );
        resetScores();
        if (userId) updateUserScore(userId, 0).catch(console.error);
        startModeSwitching();
      }, 500);
    }

    // Update high score if applicable
    if (userId) {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        const currentHighScore = userDoc.exists()
          ? userDoc.data().score || 0
          : 0;

        if (playerScore > currentHighScore) {
          await updateUserScore(userId, playerScore);
          console.log("New high score saved!");
        }
      } catch (error) {
        console.error("Error updating score:", error);
      }
    }
  }
};
const startCountdown = () => {
  if (!countdownTextElement) return;

  countdownTextElement.textContent = countdown > 0 ? countdown : "";
  countdown--;

  if (countdown >= 0) {
    setTimeout(startCountdown, 600);
  } else {
    const selectedGameChoiceElement = document.querySelector(
      ".gameContent__gameChoice--isActive"
    );
    if (!selectedGameChoiceElement) {
      isGameActive = false;
      countdown = 3;
      return;
    }

    const selectedChoice = selectedGameChoiceElement.dataset.choice;
    randomResult = GAME_CHOICES[getRandomNumber()];

    showResult(selectedChoice, randomResult);
    if (gameContentElement) {
      setTimeout(
        () => gameContentElement.classList.add("gameContent--revealResult"),
        500
      );
    }

    // Update computer choice display
    if (gameChoiceComputerElement) {
      gameChoiceComputerElement.classList.add(
        `gameContent__gameChoice--is${randomResult}`
      );
      const gameChoiceImageElement = gameChoiceComputerElement.querySelector(
        ".gameContent__gameChoiceImage"
      );
      if (gameChoiceImageElement) {
        gameChoiceImageElement.setAttribute(
          "src",
          `./images/icon-${randomResult.toLowerCase()}.svg`
        );
      }
    }

    // Reset for next round
    countdown = 3;
    isGameActive = false;
  }
};

const gameChoiceEvent = (event) => {
  if (isGameActive) return;
  isGameActive = true;
  playClickSound();

  const selectedElement = event.target.closest(".gameContent__gameChoice");
  if (!selectedElement) return;

  if (gameContentElement) {
    gameContentElement.classList.add("gameContent--isActive");
  }
  selectedElement.classList.add("gameContent__gameChoice--isActive");
  startCountdown();
};

const playAgainEvent = () => {
  playClickSound();
  resetGameUI();
};

// Initialize Game
document.addEventListener("DOMContentLoaded", async () => {
  resetScores();
  resetGameUI();
  startModeSwitching();

  const userId = localStorage.getItem("userId");
  if (userId) {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        console.log("Your high score is:", userDoc.data().score || 0);
      }
    } catch (error) {
      console.error("Error loading high score:", error);
    }
  }

  document.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", playClickSound);
  });
});

// Event Listeners
if (rulesElement) rulesElement.addEventListener("click", rulesModalEvent);
if (closeElement) closeElement.addEventListener("click", rulesModalEvent);
if (modalOverlayElement)
  modalOverlayElement.addEventListener("click", rulesModalEvent);
if (gameChoiceElements) {
  gameChoiceElements.forEach((choice) =>
    choice.addEventListener("click", gameChoiceEvent)
  );
}
if (resultButtonElement)
  resultButtonElement.addEventListener("click", playAgainEvent);

const newGameBtn = document.getElementById("newGameBtn");
if (newGameBtn) {
  newGameBtn.addEventListener("click", () => {
    resetScores();
    resetGameUI();
    startModeSwitching();

    const userId = localStorage.getItem("userId");
    if (userId) {
      updateUserScore(userId, 0).catch((error) => {
        console.error("Error resetting score:", error);
      });
    }
  });
}
