import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue, get, remove } from "firebase/database";

// 🔥 Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyAxVvfLGQSfR5pnYxaTy2A_QHZ2NtJA_48",
  authDomain: "jiandaoshitoubu-20dfd.firebaseapp.com",
  databaseURL: "https://jiandaoshitoubu-20dfd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jiandaoshitoubu-20dfd",
  storageBucket: "jiandaoshitoubu-20dfd.firebasestorage.app",
  messagingSenderId: "911564599600",
  appId: "1:911564599600:web:0d0f4fda1cecdd8b4c18f5"
};

// 🔥 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  // 基本游戏状态
  const [step, setStep] = useState("login");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPlayerA, setIsPlayerA] = useState(false);

  // 游戏选择相关状态
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState("");
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [opponentMessage, setOpponentMessage] = useState("");
  const [opponentConfirmed, setOpponentConfirmed] = useState(false);

  // 倒计时和结果相关状态
  const [gameCountdown, setGameCountdown] = useState(10);
  const [resultCountdown, setResultCountdown] = useState(3);
  const [showResult, setShowResult] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const choices = ["Rock", "Paper", "Scissors"];

  // 🔍 验证房间代码
  const validateRoomCode = (code) => {
    return code.length === 4;
  };

  // 🎮 创建房间
  const handleCreateRoom = async () => {
    try {
      if (!name) {
        setError("Please enter your name");
        return;
      }
      if (!validateRoomCode(roomCode)) {
        setError("Room code must be 4 characters");
        return;
      }

      setLoading(true);
      setError("");
      
      const roomRef = ref(db, `rooms/${roomCode}`);
      await remove(roomRef); // 清除旧房间数据
      await update(roomRef, {
        playerA: name,
        createdAt: new Date().toISOString(),
        status: "waiting"
      });
      
      setIsPlayerA(true);
      setStep("waiting");
    } catch (err) {
      setError("Failed to create room: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🎮 加入房间
  const handleJoinRoom = async () => {
    try {
      if (!name) {
        setError("Please enter your name");
        return;
      }
      if (!validateRoomCode(roomCode)) {
        setError("Room code must be 4 characters");
        return;
      }

      setLoading(true);
      setError("");

      const roomRef = ref(db, `rooms/${roomCode}`);
      const snapshot = await get(roomRef);
      
      if (!snapshot.exists()) {
        setError("Room not found");
        return;
      }

      await update(roomRef, {
        playerB: name,
        joinedAt: new Date().toISOString(),
        status: "playing"
      });

      setIsPlayerA(false);
      setStep("game");
      setGameCountdown(10); // 设置游戏倒计时
    } catch (err) {
      setError("Failed to join room: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🎮 选择动作
  const handleChoiceSelection = (selectedChoice) => {
    if (!hasConfirmed) {
      setChoice(selectedChoice);
    }
  };

  // 🎮 确认选择
  const handleConfirm = async () => {
    if (!choice || hasConfirmed) return;

    try {
      const playerKey = isPlayerA ? "playerA" : "playerB";
      const playerData = {
        choice,
        message,
        confirmed: true,
        submittedAt: new Date().toISOString()
      };

      await update(ref(db, `rooms/${roomCode}/${playerKey}`), playerData);
      setHasConfirmed(true);
    } catch (err) {
      setError("Failed to confirm choice: " + err.message);
    }
  };

  // 🎮 获取游戏结果
  const getResult = () => {
    if (!opponentChoice) return "Waiting...";
    if (choice === opponentChoice) return "It's a tie!";
    if (
      (choice === "Rock" && opponentChoice === "Scissors") ||
      (choice === "Paper" && opponentChoice === "Rock") ||
      (choice === "Scissors" && opponentChoice === "Paper")
    ) {
      return "You Win!";
    }
    return "You Lose!";
  };

  // 🎮 获取胜利消息
  const getWinnerMessage = () => {
    if (getResult() === "You Win!") return message;
    if (getResult() === "You Lose!") return opponentMessage;
    return "";
  };

  // 🔄 重置游戏
  const resetGame = async () => {
    try {
      if (roomCode) {
        await remove(ref(db, `rooms/${roomCode}`));
      }
    } catch (err) {
      console.error("Failed to cleanup room:", err);
    }

    setStep("login");
    setName("");
    setRoomCode("");
    setChoice("");
    setMessage("");
    setHasConfirmed(false);
    setOpponentChoice(null);
    setOpponentMessage("");
    setOpponentConfirmed(false);
    setGameCountdown(10);
    setResultCountdown(3);
    setShowResult(false);
    setGameStarted(false);
    setIsPlayerA(false);
    setError("");
  };

  // 👀 监听房间状态
  useEffect(() => {
    if (step === "waiting") {
      const roomRef = ref(db, `rooms/${roomCode}`);
      const unsubscribe = onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data?.status === "playing") {
          setStep("game");
          setGameCountdown(10);
        }
      });

      return () => unsubscribe();
    }
  }, [step, roomCode]);

  // 👀 监听对手状态
  useEffect(() => {
    if (step === "game") {
      const opponentKey = isPlayerA ? "playerB" : "playerA";
      const opponentRef = ref(db, `rooms/${roomCode}/${opponentKey}`);

      const unsubscribe = onValue(opponentRef, (snapshot) => {
        const data = snapshot.val();
        if (data?.confirmed) {
          setOpponentConfirmed(true);
          setOpponentChoice(data.choice);
          setOpponentMessage(data.message || "");
        }
      });

      return () => unsubscribe();
    }
  }, [step, roomCode, isPlayerA]);

  // ⏳ 游戏选择倒计时
  useEffect(() => {
    let timer;
    if (step === "game" && !gameStarted && gameCountdown > 0) {
      timer = setInterval(() => {
        setGameCountdown((prev) => {
          if (prev <= 1) {
            if (!hasConfirmed) {
              handleConfirm();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, gameStarted, gameCountdown, hasConfirmed]);

  // 🎮 检查游戏是否结束
  useEffect(() => {
    if (step === "game" && (hasConfirmed && opponentConfirmed || gameCountdown === 0)) {
      setGameStarted(true);
      setStep("result");
    }
  }, [hasConfirmed, opponentConfirmed, gameCountdown, step]);

  // ⏳ 结果显示倒计时
  useEffect(() => {
    let timer;
    if (step === "result" && resultCountdown > 0) {
      timer = setInterval(() => {
        setResultCountdown((prev) => {
          if (prev <= 1) {
            setShowResult(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resultCountdown]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto w-full flex flex-col justify-center items-center">
        {error && (
          <div className="bg-red-500 text-white p-2 rounded mb-4 w-full text-center">
            {error}
          </div>
        )}

        {step === "login" && (
          <div className="text-center w-full">
            <h1 className="text-2xl font-bold mb-4">Enter Game Room</h1>
            <input
              type="text"
              placeholder="Your Name"
              className="p-2 rounded text-black mb-2 block w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Room Code (4 characters)"
              className="p-2 rounded text-black mb-2 block w-full"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              disabled={loading}
            />
            <button 
              onClick={handleCreateRoom}
              className={`bg-blue-500 px-4 py-2 rounded mt-2 w-full ${loading ? 'opacity-50' : ''}`}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button 
              onClick={handleJoinRoom}
              className={`bg-green-500 px-4 py-2 rounded mt-2 w-full ${loading ? 'opacity-50' : ''}`}
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        )}

        {step === "waiting" && (
          <div className="text-center">
            <h1 className="text-2xl font-bold">Waiting for opponent...</h1>
            <p className="mt-4">Room Code: {roomCode}</p>
          </div>
        )}

        {step === "game" && (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Make Your Move</h1>
            {!gameStarted && (
              <div className="mb-4 text-yellow-400">
                Time remaining: {gameCountdown} seconds
              </div>
            )}
            <div className="flex justify-center gap-4 mb-4">
              {choices.map((c) => (
                <button
                  key={c}
                  className={`px-4 py-2 rounded ${
                    choice === c ? 'bg-green-500' : 'bg-gray-700'
                  } ${hasConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => handleChoiceSelection(c)}
                  disabled={hasConfirmed}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Message to opponent"
              className="p-2 rounded text-black mt-4 block w-full"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={hasConfirmed}
            />
            <button 
              onClick={handleConfirm}
              disabled={!choice || hasConfirmed}
              className={`bg-blue-500 px-4 py-2 rounded mt-2 w-full 
                ${(!choice || hasConfirmed) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {hasConfirmed ? 'Waiting for opponent...' : 'Confirm'}
            </button>
            
            {hasConfirmed && !opponentConfirmed && (
              <p className="mt-2 text-yellow-400">
                Waiting for opponent to confirm...
              </p>
            )}
            {opponentConfirmed && !hasConfirmed && (
              <p className="mt-2 text-yellow-400">
                Opponent has made their choice!
              </p>
            )}
          </div>
        )}

        {step === "result" && (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              {!showResult ? `Revealing in ${resultCountdown}...` : 'Game Result'}
            </h1>
            {showResult && (
              <>
                <p>You chose: {choice}</p>
                <p>Opponent chose: {opponentChoice}</p>
                <p className="mt-4 font-bold text-xl">{getResult()}</p>
                {getWinnerMessage() && (
                  <p className="italic mt-2">"{getWinnerMessage()}"</p>
                )}
                <button 
                  onClick={resetGame}
                  className="bg-blue-500 px-4 py-2 rounded mt-4 w-full"
                >
                  Play Again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
