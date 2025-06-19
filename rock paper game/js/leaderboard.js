import { db } from "./auth.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

function trophyIcon(rank) {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return rank;
  }
}

export async function loadLeaderboard() {
  try {
    const leaderboardElement = document.getElementById("leaderboard-entries");
    if (!leaderboardElement) {
      console.error("Leaderboard element not found");
      return;
    }

    leaderboardElement.innerHTML = `
      <div class="loading-state">
        <i class="bx bx-loader-circle bx-spin"></i>
        <span>Loading leaderboard...</span>
      </div>
    `;

    const q = query(
      collection(db, "users"),
      orderBy("score", "desc"),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    const currentUserId = localStorage.getItem("userId");

    if (querySnapshot.empty) {
      leaderboardElement.innerHTML = `
        <div class="loading-state">
          <span>No scores yet!</span>
        </div>
      `;
      return;
    }

    let leaderboardHTML = "";
    let rank = 1;

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const isCurrentUser = doc.id === currentUserId;

      leaderboardHTML += `
        <div class="leaderboard-entry ${isCurrentUser ? "current-user" : ""}">
          <span class="rank">${trophyIcon(rank)}</span>
          <span class="name">${userData.name || "Anonymous"}</span>
          <span class="score">${userData.score || 0}</span>
        </div>
      `;
      rank++;
    });

    leaderboardElement.innerHTML = leaderboardHTML;
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    const leaderboardElement = document.getElementById("leaderboard-entries");
    if (leaderboardElement) {
      leaderboardElement.innerHTML = `
        <div class="loading-state">
          <span>Error loading leaderboard</span>
        </div>
      `;
    }
  }
}
