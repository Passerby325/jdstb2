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
  const [step, setStep] = useState("login");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState("");
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [opponentMessage, setOpponentMessage] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [showResult, setShowResult] = useState(false);
  const [resultStep, setResultStep] = useState(0);
  const [isPlayerA, setIsPlayerA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const choices = ["Rock", "Paper", "Scissors"];

  // 验证房间代码
  function validateRoomCode(code) {
    return code.length === 4;
  }

  // 🕹 创建房间
  async function handleLogin() {
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
      await remove(roomRef);
      await update(roomRef, { 
        playerA: name,
        createdAt: new Date().toISOString()
      });
      setIsPlayerA(true);
      setStep("waiting");
    } catch (err) {
      setError("Failed to create room: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // 🕹 加入房间
  async function handleJoinRoom() {
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
        joinedAt: new Date().toISOString()
      });
      setIsPlayerA(false);
      setStep("game");
    } catch (err) {
      setError("Failed to join room: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // 🔄 监听对手加入
  useEffect(() => {
    if (step === "waiting") {
      const roomRef = ref(db, `rooms/${roomCode}`);
      const unsubscribe = onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data?.playerA && data?.playerB) {
          setStep("game");
        }
      });

      return () => unsubscribe();
    }
  }, [step, roomCode]);

  // 🕹 选择剪刀石头布
  function handleChoiceSelection(choice) {
    setChoice(choice);
  }

  // 🕹 确认选择 & 等待对手
  function handleConfirm() {
    const playerKey = isPlayerA ? "playerA" : "playerB";
    const playerData = {
      choice,
      message,
      submittedAt: new Date().toISOString()
    };
    
    update(ref(db, `rooms/${roomCode}/${playerKey}`), playerData);
  }

  // 监听对手选择
  useEffect(() => {
    if (step === "game") {
      const opponentKey = isPlayerA ? "playerB" : "playerA";
      const opponentRef = ref(db, `rooms/${roomCode}/${opponentKey}`);

      const unsubscribe = onValue(opponentRef, (snapshot) => {
        const data = snapshot.val();
        if (data?.choice) {
          setOpponentChoice(data.choice);
          setOpponentMessage(data.message || "");
          setStep("result");
        }
      });

      return () => unsubscribe();
    }
  }, [step, roomCode, isPlayerA]);

  // ⏳ 倒计时
  useEffect(() => {
    if (step === "result" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
        if (countdown === 1) {
          setShowResult(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  // 清理房间数据
  useEffect(() => {
    if (step === "result" && showResult) {
      const cleanup = setTimeout(() => {
        const roomRef = ref(db, `rooms/${roomCode}`);
        remove(roomRef);
      }, 5000);
      return () => clearTimeout(cleanup);
    }
  }, [step, showResult, roomCode]);

  // 🕹 结果计算
  function getResult() {
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
  }

  // 🎉 显示获胜者的留言
  function getWinnerMessage() {
    if (getResult() === "You Win!") return message;
    if (getResult() === "You Lose!") return opponentMessage;
    return "";
  }

  // 重置游戏
  function resetGame() {
    setStep("login");
    setName("");
    setRoomCode("");
    setChoice("");
    setMessage("");
    setOpponentChoice(null);
    setOpponentMessage("");
    setCountdown(3);
    setShowResult(false);
    setResultStep(0);
    setIsPlayerA(false);
    setError("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto w-full flex flex-col justify-center items-center">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-500 text-white p-2 rounded mb-4 w-full text-center">
            {error}
          </div>
        )}
        
        {/* 登录页面 */}
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
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={4}
              disabled={loading}
            />
            <button 
              onClick={handleLogin} 
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

        {/* 等待对手 */}
        {step === "waiting" && (
          <div className="text-center">
            <h1 className="text-2xl font-bold">Waiting for opponent...</h1>
            <p className="mt-4">Room Code: {roomCode}</p>
          </div>
        )}

        {/* 选择剪刀石头布 */}
        {step === "game" && (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Make Your Move</h1>
            <div className="flex justify-center gap-4 mb-4">
              {choices.map((c) => (
                <button
                  key={c}
                  className={`px-4 py-2 rounded ${choice === c ? 'bg-green-500' : 'bg-gray-700'}`}
                  onClick={() => handleChoiceSelection(c)}
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
            />
            <button 
              onClick={handleConfirm}
              disabled={!choice}
              className={`bg-blue-500 px-4 py-2 rounded mt-2 w-full ${!choice ? 'opacity-50' : ''}`}
            >
              Confirm
            </button>
          </div>
        )}

        {/* 结果 */}
        {step === "result" && (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              {!showResult ? `Revealing in ${countdown}...` : 'Game Result'}
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
