import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
let initialized = false;
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyD6B1h5Q0Necqu-n7I9kG7vmYCzGKmlWmk",
    authDomain: "meta-reclame-aqui.firebaseapp.com",
    projectId: "meta-reclame-aqui",
    storageBucket: "meta-reclame-aqui.firebasestorage.app",
    messagingSenderId: "314080655380",
    appId: "1:314080655380:web:534068c653400af2a30f01",
    measurementId: "G-JSZK9Y4D0K"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let userRole = null;
function getCurrentMonth() {
  const now = new Date();

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return `${meses[now.getMonth()]}`;
}

const docRef = doc(db, "dashboard", "dados");

const animationRef = doc(db, "dashboard", "animation");

const MASCOT_IMAGE_SRC = "otimo.ad07c69b.png";

const defaultState = {
  expectedScore: 8.7,
  projectionCurrent: 7.3,
  dailyGoal: 12,
  totalExpected: 160,
  previousEvaluations: 0,
  positives: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

const elements = {
  expectedScoreDisplay: document.querySelector("#expectedScoreDisplay"),
  projectionCurrentHeader: document.querySelector("#projectionCurrentHeader"),
  expectedScore: document.querySelector("#expectedScore"),
  projectionCurrent: document.querySelector("#projectionCurrent"),
  dailyGoal: document.querySelector("#dailyGoal"),
  totalExpected: document.querySelector("#totalExpected"),
  previousEvaluations: document.querySelector("#previousEvaluations"),
  evaluationGrid: document.querySelector("#evaluationGrid"),
  positiveCount: document.querySelector("#positiveCount"),
  coveragePercent: document.querySelector("#coveragePercent"),
  dailyStatus: document.querySelector("#dailyStatus"),
  statusMessage: document.querySelector("#statusMessage"),
};

let state = defaultState;
let toastTimeoutId = 0;

onAuthStateChanged(auth, async (user) => {
if (user) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "block";

  document.getElementById("userEmail").textContent = user.email;

  document.getElementById("currentMonth").textContent =
  "Mês: " + getCurrentMonth();

    const docRefUser = doc(db, "users", user.email);
    const docSnap = await getDoc(docRefUser);

    if (docSnap.exists()) {
      userRole = docSnap.data().role || "operador";
      aplicarPermissoes();
    }
  } else {
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("app").style.display = "none";
  }
});

onSnapshot(docRef, (docSnap) => {
  if (docSnap.exists()) {
    state = sanitizeState(docSnap.data());
  } else {
    state = defaultState;
  }

if (!initialized) {
  initialize();
  initialized = true;
} else {
  syncInputsFromState();
  render(false);
}
});
let lastAnimationTimestamp = 0;

let firstLoadAnimation = true;

onSnapshot(animationRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();

    // 👇 IGNORA PRIMEIRA EXECUÇÃO
    if (firstLoadAnimation) {
      lastAnimationTimestamp = data.timestamp;
      firstLoadAnimation = false;
      return;
    }

    // 👇 DISPARA SÓ QUANDO CLICAR
    if (data.timestamp !== lastAnimationTimestamp) {
      lastAnimationTimestamp = data.timestamp;
      showAnimation();
    }
  }
});

function initialize() {
  bindInputs();
  syncInputsFromState();
  render(false);
}

function loadState() {
  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return sanitizeState(defaultState);
    }

    return sanitizeState(JSON.parse(rawState));
  } catch (error) {
    console.warn("Nao foi possivel carregar o estado salvo.", error);
    return sanitizeState(defaultState);
  }
}

function sanitizeState(rawState) {
  const totalExpected = normalizeNumber(rawState.totalExpected, defaultState.totalExpected, {
    min: 1,
    integer: true,
  });

  const positives = Array.from(
    new Set(
      (Array.isArray(rawState.positives) ? rawState.positives : defaultState.positives)
        .map((item) => normalizeNumber(item, 0, { min: 0, integer: true }))
        .filter((item) => item > 0 && item <= totalExpected)
    )
  ).sort((a, b) => a - b);

  return {
    expectedScore: normalizeNumber(rawState.expectedScore, defaultState.expectedScore, {
      min: 0,
      max: 10,
    }),
    projectionCurrent: normalizeNumber(rawState.projectionCurrent, defaultState.projectionCurrent, {
      min: 0,
      max: 10,
    }),
    dailyGoal: normalizeNumber(rawState.dailyGoal, defaultState.dailyGoal, {
      min: 0,
      integer: true,
    }),
    totalExpected,
    previousEvaluations: normalizeNumber(
      rawState.previousEvaluations,
      defaultState.previousEvaluations,
      { min: 0, integer: true }
    ),
    positives,
  };
}

function normalizeNumber(value, fallback, options = {}) {
  const parsed = Number(value);
  let safeValue = Number.isFinite(parsed) ? parsed : fallback;

  if (typeof options.min === "number") {
    safeValue = Math.max(options.min, safeValue);
  }

  if (typeof options.max === "number") {
    safeValue = Math.min(options.max, safeValue);
  }

  return options.integer ? Math.round(safeValue) : Number(safeValue.toFixed(1));
}

function bindInputs() {
  const bindings = [
    {
      element: elements.expectedScore,
      key: "expectedScore",
      options: { min: 0, max: 10 },
    },
    {
      element: elements.projectionCurrent,
      key: "projectionCurrent",
      options: { min: 0, max: 10 },
    },
    {
      element: elements.dailyGoal,
      key: "dailyGoal",
      options: { min: 0, integer: true },
    },
    {
      element: elements.totalExpected,
      key: "totalExpected",
      options: { min: 1, integer: true },
      onCommit: handleTotalExpectedChange,
    },
    {
      element: elements.previousEvaluations,
      key: "previousEvaluations",
      options: { min: 0, integer: true },
    },
  ];

  bindings.forEach(({ element, key, options, onCommit }) => {
element.addEventListener("input", () => {
  state[key] = normalizeNumber(element.value, state[key], options);

  if (key === "projectionCurrent") {
    syncProjectionFields();
  }

  if (key === "totalExpected") {
    onCommit?.();
  }

  if (key === "previousEvaluations") {
    trimTodayEvaluationsToAvailableSlots();
  }

  render(); // 👈 AGORA SALVA EM TEMPO REAL
});

    element.addEventListener("change", () => {
      state[key] = normalizeNumber(element.value, state[key], options);

      if (key === "totalExpected") {
        onCommit?.();
      }

      if (key === "previousEvaluations") {
        trimTodayEvaluationsToAvailableSlots();
      }

      syncInputsFromState();
      render();
    });
  });
}

function handleTotalExpectedChange() {
  trimTodayEvaluationsToAvailableSlots();
}

function trimTodayEvaluationsToAvailableSlots() {
  const availableTodaySlots = Math.max(state.totalExpected - state.previousEvaluations, 0);
  state.positives = state.positives.filter((index) => index <= availableTodaySlots);
}

function syncInputsFromState() {
  elements.expectedScore.value = state.expectedScore.toFixed(1);
  elements.dailyGoal.value = state.dailyGoal;
  elements.totalExpected.value = state.totalExpected;
  elements.previousEvaluations.value = state.previousEvaluations;
  syncExpectedScoreDisplay();
  syncProjectionFields();
}

function syncProjectionFields() {
  const formattedProjection = state.projectionCurrent.toFixed(1);
  elements.projectionCurrent.value = formattedProjection;
  elements.projectionCurrentHeader.textContent = formattedProjection;
}

function syncExpectedScoreDisplay() {
  elements.expectedScoreDisplay.textContent = state.expectedScore.toFixed(1);
}

function render(shouldPersist = true) {
  syncExpectedScoreDisplay();
  syncProjectionFields();
  renderSummary();
  renderGrid();

  if (shouldPersist) {
    persistState();
  }
}

function renderSummary() {
  const todayCount = state.positives.length;
  const historicalCount = Math.min(state.previousEvaluations, state.totalExpected);
  const monthlyCount = Math.min(historicalCount + todayCount, state.totalExpected);
  const coveragePercent = state.totalExpected
    ? Math.round((monthlyCount / state.totalExpected) * 100)
    : 0;

  elements.positiveCount.textContent = String(monthlyCount);
  elements.coveragePercent.textContent = `${coveragePercent}%`;
  elements.dailyStatus.textContent = `${todayCount} / ${state.dailyGoal}`;
}

function renderGrid() {
  const todaySet = new Set(state.positives);
  const historicalCount = Math.min(state.previousEvaluations, state.totalExpected);
  const fragment = document.createDocumentFragment();

  for (let index = 1; index <= state.totalExpected; index += 1) {
    const isHistorical = index <= historicalCount;
    const adjustedTodayIndex = index - historicalCount;
    const isTodayPositive = adjustedTodayIndex > 0 && todaySet.has(adjustedTodayIndex);
    const isPositive = isHistorical || isTodayPositive;
    const itemWrapper = document.createElement("div");
    const item = document.createElement("button");

    itemWrapper.className = "evaluation-cell";
    itemWrapper.setAttribute("role", "listitem");
    item.type = "button";
    item.className = `evaluation-item ${isPositive ? "evaluation-item--positive" : "evaluation-item--expected"} ${isHistorical ? "evaluation-item--historical" : ""}`.trim();
    item.setAttribute("aria-pressed", String(isPositive));
    item.dataset.index = String(index);
    item.disabled = isHistorical;
    item.setAttribute(
      "aria-label",
      isHistorical
        ? `Avaliacao ${index}, positiva de dias anteriores.`
        : isPositive
        ? `Avaliacao ${index}, positiva. Pressione para voltar para esperada.`
        : `Avaliacao ${index}, esperada. Pressione para marcar como positiva.`
    );

    item.innerHTML = `
      <span class="evaluation-item__visual" aria-hidden="true">
        ${isPositive ? getMascotMarkup(index) : `<span class="evaluation-item__placeholder">${index}</span>`}
      </span>
      ${isPositive ? `<span class="evaluation-item__caption">${index}</span>` : ""}
      <span class="sr-only">${isHistorical ? "Avaliacao positiva de dias anteriores" : isPositive ? "Avaliacao positiva" : "Avaliacao esperada"}</span>
    `;

    if (!isHistorical) {
      item.addEventListener("click", () => toggleEvaluation(adjustedTodayIndex));
    }
    itemWrapper.appendChild(item);
    fragment.appendChild(itemWrapper);
  }

  elements.evaluationGrid.replaceChildren(fragment);
}

function toggleEvaluation(index) {
  const positiveSet = new Set(state.positives);
  const wasPositive = positiveSet.has(index);

  if (wasPositive) {
    positiveSet.delete(index);
  } else {
    positiveSet.add(index);
  }

  state.positives = Array.from(positiveSet).sort((a, b) => a - b);
  render();
  setDoc(animationRef, {
  timestamp: Date.now()
});
  showStatusMessage(
    wasPositive
      ? `Avaliacao ${index} voltou para o estado esperado.`
      : `Avaliacao ${index} marcada como positiva.`
  );
}

function persistState() {
  setDoc(docRef, state);
}

function showStatusMessage(message) {
  window.clearTimeout(toastTimeoutId);
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.add("is-visible");

  toastTimeoutId = window.setTimeout(() => {
    elements.statusMessage.classList.remove("is-visible");
  }, 2200);
}

function getMascotMarkup(index) {
  return `<img src="${MASCOT_IMAGE_SRC}" alt="" loading="lazy" decoding="async">`;
}

function aplicarPermissoes() {
  const isGestor = userRole === "gestor";

  // trava inputs
  Object.values(elements).forEach((el) => {
    if (el && el.tagName === "INPUT") {
      el.disabled = !isGestor;
    }
  });

  // trava cliques nas avaliações
  if (!isGestor) {
    document.querySelectorAll(".evaluation-item").forEach((item) => {
      item.style.pointerEvents = "none";
      item.style.opacity = "0.6";
    });
  }
}

function login(email, senha) {
  signInWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      console.log("Logado com sucesso:", userCredential.user.email);
    })
    .catch((error) => {
      alert("Erro no login");
      console.error(error);
    });
}
window.fazerLogin = function () {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  signInWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      console.log("Logado:", userCredential.user.email);
    })
    .catch((error) => {
      alert("Email ou senha inválidos");
      console.error(error);
    });
};
window.logout = function () {
  signOut(auth)
    .then(() => {
      console.log("Saiu com sucesso");
    })
    .catch((error) => {
      console.error("Erro ao sair:", error);
    });
};
function showAnimation() {
  const overlay = document.getElementById("animationOverlay");

  overlay.style.display = "flex";

  setTimeout(() => {
    overlay.style.display = "none";
  }, 5000);
}
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("currentMonth");
  if (el) {
    el.textContent = "Mês: " + getCurrentMonth();
  }
});
