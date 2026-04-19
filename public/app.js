(() => {
  // Elements
  const stepInput = document.getElementById("step-input");
  const stepQuestions = document.getElementById("step-questions");
  const stepResults = document.getElementById("step-results");
  const formText = document.getElementById("form-text");
  const parseBtn = document.getElementById("parse-btn");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  const questionCard = document.getElementById("question-card");
  const sectionLabel = document.getElementById("section-label");
  const questionText = document.getElementById("question-text");
  const originalField = document.getElementById("original-field");
  const answerText = document.getElementById("answer-text");
  const answerLong = document.getElementById("answer-long");
  const inputTextWrap = document.getElementById("input-text-wrap");
  const inputLongWrap = document.getElementById("input-long-wrap");
  const inputChoices = document.getElementById("input-choices");
  const inputYesno = document.getElementById("input-yesno");
  const micBtn = document.getElementById("mic-btn");
  const micBtnLong = document.getElementById("mic-btn-long");
  const micStatus = document.getElementById("mic-status");
  const backBtn = document.getElementById("back-btn");
  const skipBtn = document.getElementById("skip-btn");
  const nextBtn = document.getElementById("next-btn");
  const resultsContent = document.getElementById("results-content");
  const copyAllBtn = document.getElementById("copy-all-btn");
  const startOverBtn = document.getElementById("start-over-btn");
  const dyslexiaFont = document.getElementById("dyslexia-font");

  let questions = [];
  let answers = {};
  let currentIndex = 0;

  // Parse form
  parseBtn.addEventListener("click", async () => {
    const text = formText.value.trim();
    if (!text) return;

    parseBtn.disabled = true;
    parseBtn.textContent = "Reading your form...";
    document.body.classList.add("loading");

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formText: text }),
      });

      if (!res.ok) throw new Error("Parse failed");

      const data = await res.json();
      questions = data.questions || [];

      if (questions.length === 0) {
        parseBtn.textContent = "No questions found — try pasting differently";
        parseBtn.disabled = false;
        document.body.classList.remove("loading");
        return;
      }

      answers = {};
      currentIndex = 0;
      showStep("questions");
      showQuestion(currentIndex);
    } catch (err) {
      parseBtn.textContent = "Something went wrong — try again";
      setTimeout(() => {
        parseBtn.textContent = "Break it down";
        parseBtn.disabled = false;
      }, 2000);
    } finally {
      document.body.classList.remove("loading");
    }
  });

  function showStep(step) {
    stepInput.classList.add("hidden");
    stepQuestions.classList.add("hidden");
    stepResults.classList.add("hidden");

    if (step === "input") stepInput.classList.remove("hidden");
    if (step === "questions") stepQuestions.classList.remove("hidden");
    if (step === "results") stepResults.classList.remove("hidden");
  }

  function showQuestion(index) {
    const q = questions[index];
    if (!q) return;

    // Progress
    const pct = Math.round(((index) / questions.length) * 100);
    progressFill.style.width = pct + "%";
    progressText.textContent = `Question ${index + 1} of ${questions.length}`;

    // Section
    if (q.section) {
      sectionLabel.textContent = q.section;
      sectionLabel.classList.remove("hidden");
    } else {
      sectionLabel.classList.add("hidden");
    }

    // Question
    questionText.textContent = q.question;
    originalField.textContent = `Form field: "${q.original}"`;

    // Hide all input types
    inputTextWrap.classList.add("hidden");
    inputLongWrap.classList.add("hidden");
    inputChoices.classList.add("hidden");
    inputYesno.classList.add("hidden");

    // Show appropriate input
    const type = q.type || "text";
    const existingAnswer = answers[q.id] || "";

    if (type === "choice" && q.choices && q.choices.length > 0) {
      inputChoices.innerHTML = "";
      q.choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = choice;
        btn.dataset.value = choice;
        if (existingAnswer === choice) btn.classList.add("selected");
        btn.addEventListener("click", () => {
          inputChoices.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
        });
        inputChoices.appendChild(btn);
      });
      inputChoices.classList.remove("hidden");
    } else if (type === "yes_no") {
      inputYesno.querySelectorAll(".choice-btn").forEach((btn) => {
        btn.classList.remove("selected");
        if (existingAnswer === btn.dataset.value) btn.classList.add("selected");
      });
      inputYesno.classList.remove("hidden");
    } else if (type === "long_text") {
      answerLong.value = existingAnswer;
      inputLongWrap.classList.remove("hidden");
      answerLong.focus();
    } else {
      answerText.value = existingAnswer;
      inputTextWrap.classList.remove("hidden");
      answerText.focus();
    }

    // Nav state
    backBtn.disabled = index === 0;
    nextBtn.textContent = index === questions.length - 1 ? "Finish" : "Next";

    // Animate
    questionCard.style.animation = "none";
    questionCard.offsetHeight; // trigger reflow
    questionCard.style.animation = "slideIn 0.25s ease";
  }

  function getCurrentAnswer() {
    const q = questions[currentIndex];
    const type = q.type || "text";

    if (type === "choice") {
      const selected = inputChoices.querySelector(".choice-btn.selected");
      return selected ? selected.dataset.value : "";
    } else if (type === "yes_no") {
      const selected = inputYesno.querySelector(".choice-btn.selected");
      return selected ? selected.dataset.value : "";
    } else if (type === "long_text") {
      return answerLong.value.trim();
    } else {
      return answerText.value.trim();
    }
  }

  function saveCurrentAnswer() {
    const q = questions[currentIndex];
    const answer = getCurrentAnswer();
    if (answer) {
      answers[q.id] = answer;
    }
  }

  // Yes/No button clicks
  inputYesno.querySelectorAll(".choice-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      inputYesno.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

  // Next
  nextBtn.addEventListener("click", async () => {
    saveCurrentAnswer();

    if (currentIndex === questions.length - 1) {
      await finishForm();
    } else {
      currentIndex++;
      showQuestion(currentIndex);
    }
  });

  // Back
  backBtn.addEventListener("click", () => {
    saveCurrentAnswer();
    if (currentIndex > 0) {
      currentIndex--;
      showQuestion(currentIndex);
    }
  });

  // Skip
  skipBtn.addEventListener("click", () => {
    if (currentIndex < questions.length - 1) {
      currentIndex++;
      showQuestion(currentIndex);
    } else {
      finishForm();
    }
  });

  // Enter key advances to next
  answerText.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextBtn.click();
    }
  });

  async function finishForm() {
    const answeredQuestions = questions
      .filter((q) => answers[q.id])
      .map((q) => ({
        id: q.id,
        question: q.question,
        original: q.original,
        answer: answers[q.id],
      }));

    if (answeredQuestions.length === 0) {
      // No answers — just show raw
      resultsContent.textContent = "No answers to show. Go back and answer some questions.";
      showStep("results");
      return;
    }

    // Show results step with loading
    showStep("results");
    resultsContent.textContent = "Formatting your answers...";
    copyAllBtn.disabled = true;

    try {
      const res = await fetch("/api/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answeredQuestions }),
      });

      if (!res.ok) throw new Error("Format failed");

      const data = await res.json();
      resultsContent.textContent = data.formatted;
      copyAllBtn.disabled = false;
    } catch (err) {
      // Fallback: show raw answers
      const raw = answeredQuestions
        .map((a) => `${a.id}. ${a.original}: ${a.answer}`)
        .join("\n");
      resultsContent.textContent = raw;
      copyAllBtn.disabled = false;
    }
  }

  // Copy all
  copyAllBtn.addEventListener("click", async () => {
    const text = resultsContent.textContent;
    await copyToClipboard(text);
    copyAllBtn.textContent = "Copied!";
    setTimeout(() => (copyAllBtn.textContent = "Copy all"), 1500);
  });

  // Start over
  startOverBtn.addEventListener("click", () => {
    formText.value = "";
    questions = [];
    answers = {};
    currentIndex = 0;
    parseBtn.textContent = "Break it down";
    parseBtn.disabled = false;
    showStep("input");
  });

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  // Voice input
  let recognition = null;
  let isRecording = false;
  let activeInput = null;

  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim = transcript;
        }
      }
      if (activeInput) {
        activeInput.value = finalTranscript + interim;
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        stopRecording();
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        showMicStatusMsg("Microphone access denied. Check your browser permissions.");
      } else if (event.error !== "aborted") {
        showMicStatusMsg("Couldn't hear you — try again.");
      }
      stopRecording();
    };

    function startRecording(inputEl, btn) {
      if (isRecording) {
        recognition.stop();
        stopRecording();
        return;
      }
      activeInput = inputEl;
      finalTranscript = inputEl.value;
      recognition.start();
      isRecording = true;
      micBtn.classList.remove("recording");
      micBtnLong.classList.remove("recording");
      btn.classList.add("recording");
      showMicStatusMsg("Listening... tap mic again to stop.");
    }

    micBtn.addEventListener("click", () => startRecording(answerText, micBtn));
    micBtnLong.addEventListener("click", () => startRecording(answerLong, micBtnLong));
  } else {
    micBtn.style.display = "none";
    micBtnLong.style.display = "none";
  }

  function stopRecording() {
    isRecording = false;
    micBtn.classList.remove("recording");
    micBtnLong.classList.remove("recording");
    hideMicStatus();
  }

  function showMicStatusMsg(msg) {
    micStatus.textContent = msg;
    micStatus.classList.remove("hidden");
  }

  function hideMicStatus() {
    micStatus.classList.add("hidden");
  }

  // Dyslexia font toggle
  if (localStorage.getItem("dyslexia-font") === "true") {
    dyslexiaFont.checked = true;
    document.body.classList.add("dyslexia-mode");
  }

  dyslexiaFont.addEventListener("change", () => {
    document.body.classList.toggle("dyslexia-mode", dyslexiaFont.checked);
    localStorage.setItem("dyslexia-font", dyslexiaFont.checked);
  });

  // Keyboard shortcut: Ctrl/Cmd+Enter on paste area
  formText.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      parseBtn.click();
    }
  });
})();
