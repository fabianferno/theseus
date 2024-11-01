"use client";

import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Volume2, Copy, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { Navigation } from "./navigation";

import { useRouter, usePathname } from "next/navigation";
import { NearContext } from "@/wallets/near";
import { simpleGptContract } from "@/config";

import { io } from "socket.io-client";

export function NearSimpleGpt() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLogoVisible, setIsLogoVisible] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState("Simple GPT");
  const [logs, setLogs] = useState([]);
  const [chatId, setChatId] = useState(0);
  const [isFetch, setIsFetch] = useState(false);

  const router = useRouter();
  const currentPath = usePathname();
  const CONTRACT = simpleGptContract;

  // Wallet
  const { signedAccountId, wallet } = useContext(NearContext);

  useEffect(() => {
    console.log(currentPath);
    setSelectedRoute(
      currentPath === "/"
        ? "Simple GPT"
        : currentPath === "/functioncall"
        ? "GPT with FunctionCall"
        : "Agent"
    );
  }, [currentPath]);

  useEffect(() => {
    const socket = io("http://localhost:4000");

    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
      setLogs((prevLogs) => [...prevLogs, "Connected to WebSocket server"]);
    });

    socket.on("log", (logMessage) => {
      const log = JSON.parse(logMessage);
      console.log(log);
      // if (log.id === chatId) {
      const message = log.type + ": " + log.id;
      if (log.type === "openAiResponseAdded") {
        setIsFetch(true);
      }
      setLogs((prevLogs) => [...prevLogs, message]);
      // }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
      setLogs((prevLogs) => [
        ...prevLogs,
        "Disconnected from WebSocket server",
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setIsLogoVisible(messages.length === 0);
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() !== "") {
      setMessages([...messages, { role: "user", content: inputMessage }]);
      const response = await wallet.callMethod({
        contractId: CONTRACT,
        method: "startChat",
        args: { message: inputMessage },
        gas: "300000000000000",
      });
      console.log(response);
      setChatId(response);

      setLogs((prevLogs) => [...prevLogs, `Message sent to oracle`]);
    }
  };

  const handleRouteChange = (route) => {
    setSelectedRoute(route);
    if (route === "Simple GPT") {
      router.push("/");
      return;
    } else if (route === "GPT with FunctionCall") {
      router.push("/functioncall");
      return;
    } else if (route === "Agent") {
      router.push("/agent");
      return;
    }
  };

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        yoyo: Infinity,
        ease: "easeInOut",
      },
    },
  };
  const logVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  const sidebarVariants = {
    hidden: { x: "-100%" },
    visible: { x: 0, transition: { duration: 0.3 } },
  };

  useEffect(() => {
    const fetchMessageData = async () => {
      if (isFetch) {
        const updatedResponse = await wallet.viewMethod({
          contractId: CONTRACT,
          method: "getMessageHistory",
          args: { chatId: chatId },
        });
        const message = {
          role: updatedResponse[updatedResponse.length - 1].role,
          content: updatedResponse[updatedResponse.length - 1].content[0].value,
        };
        setMessages((prevmessages) => [...prevmessages, message]);
        setIsFetch(false);
      }
    };
    fetchMessageData();
  }, [isFetch]);

  return (
    <div className="flex h-screen bg-black text-green-400">
      <motion.div
        className="w-64 bg-gray-900 p-4 border-r border-green-400/20"
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
      >
        <h2 className="text-xl font-bold mb-4">Examples</h2>
        {["Simple GPT", "GPT with FunctionCall", "Agent"].map((route) => (
          <motion.button
            key={route}
            className={`w-full text-left p-2 rounded-lg mb-2 ${
              selectedRoute === route
                ? "bg-green-400/20"
                : "hover:bg-green-400/10"
            }`}
            onClick={() => handleRouteChange(route)}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            {route}
          </motion.button>
        ))}
      </motion.div>
      <div className="flex flex-col flex-grow">
        <motion.header
          className="p-4 border-b border-green-400/20"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">NEAR GPT - {selectedRoute}</h1>
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Navigation />
            </motion.div>
          </div>
        </motion.header>
        <ScrollArea className="flex-grow p-4">
          <AnimatePresence>
            {isLogoVisible && (
              <motion.div
                className="flex flex-row items-center justify-center h-full"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={logoVariants}
              >
                <motion.div
                  className="w-64 h-64 mr-8"
                  animate={{
                    rotate: 360,
                    transition: {
                      duration: 20,
                      ease: "linear",
                      repeat: Infinity,
                    },
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <motion.path
                      d="M50 10 L90 90 L10 90 Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{
                        duration: 2,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                    />
                    <motion.circle
                      cx="50"
                      cy="45"
                      r="10"
                      fill="currentColor"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5, delay: 1 }}
                    />
                  </svg>
                </motion.div>
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <motion.h2
                    className="text-7xl font-bold mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    NEAR.GPT
                  </motion.h2>
                  <motion.p
                    className="text-2xl text-center max-w-2xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                  >
                    Bringing AI on-chain with the power of NEAR Protocol
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                className={`mb-4 ${
                  message.role === "user" ? "text-right" : ""
                }`}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <div
                  className={`inline-block p-3 rounded-lg ${
                    message.role === "user" ? "bg-green-400/20" : "bg-gray-800"
                  } max-w-[80%]`}
                >
                  {message.content}
                </div>
                {message.role === "assistant" && (
                  <motion.div
                    className="flex items-center mt-2 space-x-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {[Volume2, Copy, ThumbsUp, ThumbsDown, RotateCcw].map(
                      (Icon, iconIndex) => (
                        <Button
                          key={iconIndex}
                          variant="ghost"
                          size="icon"
                          className="text-green-400/80 hover:text-green-400"
                        >
                          <Icon className="w-4 h-4" />
                        </Button>
                      )
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
        <div className="border-t border-green-400/20 p-4 flex items-center">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow mr-4"
          />
          <Button onClick={handleSendMessage} variant="outline">
            Send
          </Button>
        </div>
        {/* Logs Section */}
        <ScrollArea className="border-t border-green-400/20 p-4 h-[20%]">
          <h3 className="text-xl font-bold mb-2">Logs</h3>
          {logs.map((log, index) => (
            <motion.div
              key={index}
              className="p-2 text-sm text-green-400"
              variants={logVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {log}
            </motion.div>
          ))}
        </ScrollArea>
      </div>
    </div>
  );
}
