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

// Game State
let countdown = 3;
let randomResult;
let isGameActive = false;
let playerScore = 0;
let computerScore = 0;

// Sound Effects
const clickSound = new Audio("sounds/click.wav");

// Game Functions
const playClickSound = () => {
  try {
    clickSound.currentTime = 0;
    clickSound.play().catch((e) => console.log("Audio play failed:", e));
  } catch (error) {
    console.error("Sound error:", error);
  }
};

const rulesModalEvent = () => {
  playClickSound();
  modalElement.classList.toggle("modal--isActive");
};

const getRandomNumber = () => Math.floor(Math.random() * 3);

const resetGameUI = () => {
  gameContentElement.classList.remove(
    "gameContent--revealResult",
    "gameContent--isActive",
    "gameContent--isLost",
    "gameContent--winGlow",
    "gameContent--drawEffect"
  );

  gameChoiceComputerElement.className =
    "gameContent__gameChoice gameContent__gameChoice--isComputer";
  const gameChoiceImageElement = gameChoiceComputerElement.querySelector(
    ".gameContent__gameChoiceImage"
  );
  if (gameChoiceImageElement) {
    gameChoiceImageElement.setAttribute("src", "");
  }

  document
    .querySelectorAll(".gameContent__gameChoice--isActive")
    .forEach((el) => {
      el.classList.remove("gameContent__gameChoice--isActive");
    });

  countdownTextElement.textContent = "";
  resultTextElement.textContent = "";
};

const resetScores = () => {
  playerScore = 0;
  computerScore = 0;
  playerScoreElement.textContent = "0";
  computerScoreElement.textContent = "0";
};

const showResult = async (userChoice, computerChoice) => {
  const userId = localStorage.getItem("userId");

  // Clear previous state
  gameContentElement.classList.remove(
    "gameContent--isLost",
    "gameContent--winGlow",
    "gameContent--drawEffect"
  );

  if (userChoice === computerChoice) {
    resultTextElement.textContent = "Draw";
    player.setAttribute(
      "src",
      "https://assets10.lottiefiles.com/packages/lf20_fhyjgb.json"
    );
    gameContentElement.classList.add("gameContent--drawEffect");
    setTimeout(
      () => gameContentElement.classList.remove("gameContent--drawEffect"),
      800
    );
  } else if (
    (userChoice === "Paper" && computerChoice === "Scissors") ||
    (userChoice === "Scissors" && computerChoice === "Rock") ||
    (userChoice === "Rock" && computerChoice === "Paper")
  ) {
    // Computer wins
    resultTextElement.textContent = "You lose";
    gameContentElement.classList.add("gameContent--isLost");
    computerScore++;
    computerScoreElement.textContent = computerScore;

    if (computerScore >= SCORE_LIMIT) {
      setTimeout(() => {
        alert(`You Lost!!Computer won with score ${SCORE_LIMIT}!`);
        resetScores();
        if (userId) updateUserScore(userId, 0).catch(console.error);
      }, 500);
    }
  } else {
    // Player wins
    resultTextElement.textContent = "You win";
    player.setAttribute(
      "src",
      "https://assets10.lottiefiles.com/packages/lf20_aEFaHc.json"
    );
    gameContentElement.classList.add("gameContent--winGlow");
    playerScore++;
    playerScoreElement.textContent = playerScore;

    if (playerScore >= SCORE_LIMIT) {
      setTimeout(() => {
        alert(`🎉Congratulations! You reached ${SCORE_LIMIT} points!`);
        resetScores();
        if (userId) updateUserScore(userId, 0).catch(console.error);
      }, 500);
    }

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
  countdownTextElement.textContent = countdown > 0 ? countdown : ""; // Remove "0" from countdown
  countdown--;

  if (countdown >= 0) {
    setTimeout(startCountdown, 600);
  } else {
    const selectedGameChoiceElement = document.querySelector(
      ".gameContent__gameChoice--isActive"
    );
    if (!selectedGameChoiceElement) {
      isGameActive = false;
      return;
    }

    const selectedChoice = selectedGameChoiceElement.dataset.choice;
    randomResult = GAME_CHOICES[getRandomNumber()];

    showResult(selectedChoice, randomResult);
    setTimeout(
      () => gameContentElement.classList.add("gameContent--revealResult"),
      500
    );

    // Update computer choice display
    gameChoiceComputerElement.classList.add(
      `gameContent__gameChoice--is${randomResult}`
    );
    const gameChoiceImageElement = gameChoiceComputerElement.querySelector(
      ".gameContent__gameChoiceImage"
    );
    gameChoiceImageElement.setAttribute(
      "src",
      `./images/icon-${randomResult.toLowerCase()}.svg`
    );

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

  gameContentElement.classList.add("gameContent--isActive");
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
rulesElement.addEventListener("click", rulesModalEvent);
closeElement.addEventListener("click", rulesModalEvent);
modalOverlayElement.addEventListener("click", rulesModalEvent);
gameChoiceElements.forEach((choice) =>
  choice.addEventListener("click", gameChoiceEvent)
);
resultButtonElement.addEventListener("click", playAgainEvent);

document.getElementById("newGameBtn")?.addEventListener("click", () => {
  resetScores();
  resetGameUI();

  const userId = localStorage.getItem("userId");
  if (userId) {
    updateUserScore(userId, 0).catch((error) => {
      console.error("Error resetting score:", error);
    });
  }
});
