import { useState, useEffect } from "react";
import { getDatabase, ref, set, update, onValue, remove } from "firebase/database";
import { initializeApp } from "firebase/app";

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
  const [step, setStep] = useState("login"); // "login", "waiting", "game", "result"
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState("");
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [opponentMessage, setOpponentMessage] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [showResult, setShowResult] = useState(false);
  const [resultStep, setResultStep] = useState(0);

  const choices = ["Rock", "Paper", "Scissors"];
  const isPlayerA = step === "waiting";

  // 🕹 创建房间
  function handleLogin() {
    if (name && roomCode) {
      const roomRef = ref(db, `rooms/${roomCode}`);
      remove(roomRef).then(() => {
        update(roomRef, { playerA: name });
        setStep("waiting");
      });
    }
  }

  // 🕹 加入房间
  function handleJoinRoom() {
    if (name && roomCode) {
      const roomRef = ref(db, `rooms/${roomCode}`);
      update(roomRef, { playerB: name });
      setStep("game");
    }
  }

  // 🔄 监听对手加入
  useEffect(() => {
    if (step === "waiting") {
      const roomRef = ref(db, `rooms/${roomCode}`);
      onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data?.playerA && data?.playerB) {
          setStep("game");
        }
      });
    }
  }, [step, roomCode]);

  // 🕹 选择剪刀石头布
  function handleChoiceSelection(choice) {
    setChoice(choice);
  }

  // 🕹 确认选择 & 等待对手
  function handleConfirm() {
    const playerKey = isPlayerA ? "playerA" : "playerB"; // 确定当前玩家
    update(ref(db, `rooms/${roomCode}/${playerKey}`), { choice, message });

    // ✅ 监听对手的数据，等待其提交
    const opponentKey = isPlayerA ? "playerB" : "playerA";
    const opponentRef = ref(db, `rooms/${roomCode}/${opponentKey}`);

    onValue(opponentRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.choice) {
        setOpponentChoice(data.choice);
        setOpponentMessage(data.message || ""); // 避免 message 为空时报错
        setStep("result");
      }
    });
  }

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

  // ⏳ 倒计时
  useEffect(() => {
    if (step === "result" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setShowResult(true);
    }
  }, [step, countdown]);

  useEffect(() => {
    if (showResult && resultStep < 5) {
      const timer = setTimeout(() => setResultStep(resultStep + 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showResult, resultStep]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto w-full flex flex-col justify-center items-center">
        
        {/* 登录页面 */}
        {step === "login" && (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Enter Game Room</h1>
            <input
              type="text"
              placeholder="Your Name"
              className="p-2 rounded text-black mb-2 block w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Room Code (4 characters)"
              className="p-2 rounded text-black mb-2 block w-full"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <button onClick={handleLogin} className="bg-blue-500 px-4 py-2 rounded mt-2">Create Room</button>
            <button onClick={handleJoinRoom} className="bg-green-500 px-4 py-2 rounded mt-2">Join Room</button>
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
            <div className="flex justify-center gap-4">
              {choices.map((c) => (
                <button
                  key={c}
                  className={`px-4 py-2 rounded ${choice === c ? "bg-green-500" : "bg-gray-700"}`}
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
            <button onClick={handleConfirm} className="bg-blue-500 px-4 py-2 rounded mt-2">Confirm</button>
          </div>
        )}

        {/* 结果 */}
        {step === "result" && (
          <div className="text-center">
            {countdown > 0 ? (
              <h1 className="text-2xl font-bold mb-4">Revealing in {countdown}...</h1>
            ) : (
              showResult && (
                <>
                  {resultStep > 0 && <h1 className="text-2xl font-bold mb-4 animate-shake">Results</h1>}
                  {resultStep > 1 && <p className="animate-shake">You chose: {choice}</p>}
                  {resultStep > 2 && <p className="animate-shake">Opponent chose: {opponentChoice}</p>}
                  {resultStep > 3 && <p className="mt-4 font-bold animate-shake">{getResult()}</p>}
                  {resultStep > 4 && <p className="italic mt-2 animate-shake">"{getWinnerMessage()}"</p>}
                </>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
