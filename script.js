// script.js

(() => {
  "use strict";

  /* ---------- Constants ---------- */

  const API_BASE_URL = "https://opentdb.com/api.php";
  const CATEGORY_API_URL = "https://opentdb.com/api_category.php";
  const TIME_LIMIT = 30;
  const QUESTION_AMOUNT = 5;

  /* ---------- DOM Elements ---------- */

  const startButton = document.getElementById("start-button");
  const restartButton = document.getElementById("restart-button");
  const nextButton = document.getElementById("next-button");
  const questionContainer = document.getElementById("question-container");
  const questionElement = document.getElementById("question");
  const answerButtonsElement = document.getElementById("answer-buttons");
  const resultContainer = document.getElementById("result-container");
  const resultElement = document.getElementById("result");
  const timerElement = document.getElementById("time");
  const startContainer = document.getElementById("start-container");
  const endContainer = document.getElementById("end-container");
  const finalScoreElement = document.getElementById("final-score");
  const difficultySelect = document.getElementById("difficulty");
  const categorySelect = document.getElementById("category");
  const highScoreElement = document.getElementById("high-score");

  /* ---------- Game Variables ---------- */

  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let timer;
  let timeLeft = TIME_LIMIT;
  let highScore = localStorage.getItem("highScore") || 0;

  /* ---------- Event Listeners ---------- */

  document.addEventListener("DOMContentLoaded", populateCategories);
  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", restartGame);
  nextButton.addEventListener("click", handleNextButton);

  /* ---------- Functions ---------- */

  /**
   * Populates the category select element with categories from the API.
   */
  async function populateCategories() {
    try {
      const response = await fetch(CATEGORY_API_URL);
      const data = await response.json();
      data.trivia_categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
    } catch (error) {
      alert("Error fetching categories: " + error.message);
    }
    // Set high score display
    highScoreElement.textContent = highScore;
  }

  /**
   * Fetches questions based on selected difficulty and category.
   */
  async function fetchQuestions() {
    const difficulty = difficultySelect.value;
    const category = categorySelect.value;
    const url = `${API_BASE_URL}?amount=${QUESTION_AMOUNT}&type=multiple&difficulty=${difficulty}&category=${category}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.response_code !== 0) {
        throw new Error("Failed to fetch questions.");
      }
      questions = data.results;
    } catch (error) {
      alert("Error fetching questions: " + error.message);
    }
  }

  /**
   * Starts the game by fetching questions and displaying the first one.
   */
  async function startGame() {
    startContainer.classList.add("hide");
    await fetchQuestions();
    if (questions.length === 0) {
      alert("No questions available. Please try again later.");
      startContainer.classList.remove("hide");
      return;
    }
    currentQuestionIndex = 0;
    score = 0;
    questionContainer.classList.remove("hide");
    setNextQuestion();
  }

  /**
   * Sets up the next question in the quiz.
   */
  function setNextQuestion() {
    resetState();
    showQuestion(questions[currentQuestionIndex]);
  }

  /**
   * Displays the current question and answer options.
   * @param {Object} question - The current question object.
   */
  function showQuestion(question) {
    questionElement.innerHTML = decodeHTML(question.question);
    const answers = [...question.incorrect_answers, question.correct_answer];
    shuffleArray(answers);
    answers.forEach((answer) => {
      const button = document.createElement("button");
      button.innerHTML = decodeHTML(answer);
      button.classList.add("btn");
      button.type = "button";
      button.addEventListener("click", () =>
        selectAnswer(button, question.correct_answer)
      );
      answerButtonsElement.appendChild(button);
    });
    startTimer();
  }

  /**
   * Resets the game state for the next question.
   */
  function resetState() {
    clearStatusClasses();
    resultContainer.classList.add("hide");
    nextButton.classList.add("hide");
    while (answerButtonsElement.firstChild) {
      answerButtonsElement.removeChild(answerButtonsElement.firstChild);
    }
    clearInterval(timer);
    timeLeft = TIME_LIMIT;
    timerElement.textContent = timeLeft;
  }

  /**
   * Handles the user's answer selection.
   * @param {HTMLElement} selectedButton - The button the user clicked.
   * @param {string} correctAnswer - The correct answer to the question.
   */
  function selectAnswer(selectedButton, correctAnswer) {
    clearInterval(timer);
    const selectedAnswer = selectedButton.innerHTML;
    if (selectedAnswer === decodeHTML(correctAnswer)) {
      selectedButton.classList.add("correct");
      resultElement.textContent = "Correct!";
      score++;
    } else {
      selectedButton.classList.add("wrong");
      resultElement.textContent = `Wrong! Correct answer: ${decodeHTML(
        correctAnswer
      )}`;
      highlightCorrectAnswer(correctAnswer);
    }
    disableAnswerButtons();
    resultContainer.classList.remove("hide");
    nextButton.classList.remove("hide");
  }

  /**
   * Highlights the correct answer.
   * @param {string} correctAnswer - The correct answer to the question.
   */
  function highlightCorrectAnswer(correctAnswer) {
    Array.from(answerButtonsElement.children).forEach((button) => {
      if (button.innerHTML === decodeHTML(correctAnswer)) {
        button.classList.add("correct");
      }
    });
  }

  /**
   * Disables all answer buttons to prevent further input.
   */
  function disableAnswerButtons() {
    Array.from(answerButtonsElement.children).forEach((button) => {
      button.disabled = true;
    });
  }

  /**
   * Clears status classes from answer buttons.
   */
  function clearStatusClasses() {
    Array.from(answerButtonsElement.children).forEach((button) => {
      button.classList.remove("correct", "wrong");
      button.disabled = false;
    });
  }

  /**
   * Shuffles an array in place using the Fisher-Yates algorithm.
   * @param {Array} array - The array to shuffle.
   */
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Decodes HTML entities in a string.
   * @param {string} html - The HTML string to decode.
   * @returns {string} - The decoded string.
   */
  function decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  /**
   * Starts the countdown timer for the current question.
   */
  function startTimer() {
    timerElement.textContent = timeLeft;
    timer = setInterval(() => {
      timeLeft--;
      timerElement.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timer);
        handleTimeOut();
      }
    }, 1000);
  }

  /**
   * Handles the scenario when the timer runs out.
   */
  function handleTimeOut() {
    resultElement.textContent = "Time's up!";
    highlightCorrectAnswer(questions[currentQuestionIndex].correct_answer);
    disableAnswerButtons();
    resultContainer.classList.remove("hide");
    nextButton.classList.remove("hide");
  }

  /**
   * Displays the final score at the end of the game and updates the high score.
   */
  function showFinalScore() {
    questionContainer.classList.add("hide");
    resultContainer.classList.add("hide");
    endContainer.classList.remove("hide");
    finalScoreElement.textContent = `You scored ${score} out of ${questions.length}!`;
    updateHighScore();
  }

  /**
   * Handles the click event for the next question button.
   */
  function handleNextButton() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      setNextQuestion();
    } else {
      showFinalScore();
    }
  }

  /**
   * Restarts the game from the beginning.
   */
  function restartGame() {
    endContainer.classList.add("hide");
    startContainer.classList.remove("hide");
  }

  /**
   * Updates the high score in localStorage if the current score is higher.
   */
  function updateHighScore() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore);
      highScoreElement.textContent = highScore;
      alert("Congratulations! You set a new high score!");
    }
  }
})();
