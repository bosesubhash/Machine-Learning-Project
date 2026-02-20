"use strict";

(function initLinguaAI() {
  const API_URL = "http://localhost:8000/translate";

  const fromLanguage = document.getElementById("fromLanguage");
  const toLanguage = document.getElementById("toLanguage");
  const inputText = document.getElementById("inputText");
  const outputText = document.getElementById("outputText");
  const translateBtn = document.getElementById("translateBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const translateAlert = document.getElementById("translateAlert");
  const contactForm = document.getElementById("contactForm");
  const contactAlert = document.getElementById("contactAlert");
  const currentYear = document.getElementById("year");

  function showTranslateAlert(message, type) {
    translateAlert.className = `alert alert-${type} mb-3`;
    translateAlert.textContent = message;
    translateAlert.classList.remove("d-none");
  }

  function hideTranslateAlert() {
    translateAlert.classList.add("d-none");
  }

  function setLoadingState(isLoading) {
    const spinner = translateBtn.querySelector(".spinner-border");
    const label = translateBtn.querySelector(".btn-text");

    if (isLoading) {
      translateBtn.disabled = true;
      spinner.classList.remove("d-none");
      label.textContent = "Translating...";
    } else {
      translateBtn.disabled = false;
      spinner.classList.add("d-none");
      label.textContent = "Translate";
    }
  }

  function normalizeLanguageSelection(changedSelect, otherSelect) {
    if (changedSelect.value === otherSelect.value) {
      otherSelect.value = changedSelect.value === "en" ? "hi" : "en";
    }
  }

  async function translate() {
    hideTranslateAlert();

    const text = inputText.value.trim();
    const source = fromLanguage.value;
    const target = toLanguage.value;

    if (!text) {
      showTranslateAlert("Please enter text before translating.", "warning");
      return;
    }

    setLoadingState(true);
    outputText.value = "";

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          source,
          target
        })
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch (jsonError) {
        payload = {};
      }

      if (!response.ok) {
        const errorMessage = payload.detail || "Translation failed. Please try again.";
        throw new Error(errorMessage);
      }

      if (!payload.translated_text) {
        throw new Error("No translated output returned by the API.");
      }

      outputText.value = payload.translated_text;
    } catch (error) {
      showTranslateAlert(error.message, "danger");
    } finally {
      setLoadingState(false);
    }
  }

  async function copyOutput() {
    hideTranslateAlert();

    const text = outputText.value.trim();
    if (!text) {
      showTranslateAlert("Nothing to copy. Translate text first.", "warning");
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        outputText.removeAttribute("readonly");
        outputText.select();
        document.execCommand("copy");
        outputText.setAttribute("readonly", "readonly");
      }
      showTranslateAlert("Translated text copied to clipboard.", "success");
    } catch (error) {
      showTranslateAlert("Copy failed. Please copy manually.", "danger");
    }
  }

  function clearTranslator() {
    hideTranslateAlert();
    inputText.value = "";
    outputText.value = "";
    inputText.focus();
  }

  function handleContactSubmit(event) {
    event.preventDefault();
    if (!contactForm.checkValidity()) {
      contactForm.classList.add("was-validated");
      return;
    }

    contactAlert.classList.remove("d-none");
    contactForm.reset();
    contactForm.classList.remove("was-validated");
  }

  fromLanguage.addEventListener("change", function onFromChange() {
    normalizeLanguageSelection(fromLanguage, toLanguage);
  });

  toLanguage.addEventListener("change", function onToChange() {
    normalizeLanguageSelection(toLanguage, fromLanguage);
  });

  translateBtn.addEventListener("click", translate);
  clearBtn.addEventListener("click", clearTranslator);
  copyBtn.addEventListener("click", copyOutput);
  inputText.addEventListener("keydown", function onInputKeyDown(event) {
    if (event.ctrlKey && event.key === "Enter") {
      translate();
    }
  });

  if (contactForm) {
    contactForm.addEventListener("submit", handleContactSubmit);
  }

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }
})();
