"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "./contexts/LanguageContext";
import { languages } from "./dictionaries/languages";
import Navigation from "./components/Navigation";
import logger from "./utils/logger";
import LocationTracker from "./components/LocationTracker";

export default function PajongaChat() {
  const router = useRouter();
  const { currentLanguage } = useLanguage();
  const t = languages[currentLanguage];
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [conversationState, setConversationState] = useState("initial");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [scenes, setScenes] = useState([]);
  const [scenesLoaded, setScenesLoaded] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [currentSceneData, setCurrentSceneData] = useState(null);
  const [currentButtonTexts, setCurrentButtonTexts] = useState({});
  // Separate progressive message arrays for each scene
  const [sceneProgressiveMessages, setSceneProgressiveMessages] = useState({});
  const [currentProgressiveIndex, setCurrentProgressiveIndex] = useState(0);
  const [isShowingProgressive, setIsShowingProgressive] = useState(false);
  const [wasInterrupted, setWasInterrupted] = useState(false);
  // Survey modal state
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [pendingRedirectTarget, setPendingRedirectTarget] = useState(null);
  // Auto action state
  const [autoActionTimer, setAutoActionTimer] = useState(null);
  const messagesEndRef = useRef(null);
  const videoRef = useRef(null);
  // Image zoom modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initialize logger
  useEffect(() => {
    logger.init();
  }, []);

  // Load scenes data and show initial scene
  useEffect(() => {
    fetch("/pajonga.json")
      .then((response) => response.json())
      .then((data) => {
        setScenes(data);
        setScenesLoaded(true);
        // Load all scenes with their progressive messages
        const scenesWithMessages = {};
        data.forEach(scene => {
          if (scene.messages && scene.messages.length > 0) {
            scenesWithMessages[scene.id] = scene.messages;
          }
        });
        setSceneProgressiveMessages(scenesWithMessages);

        // Show initial scene 0 message
        const initialScene = data.find((scene) => scene.id === 0);
        if (initialScene) {
          // Update current scene data and button texts
          updateCurrentSceneData(0);

          // Check if scene 0 has progressive messages
          if (initialScene.messages && initialScene.messages.length > 0) {
            setIsShowingProgressive(true);
            setCurrentProgressiveIndex(0);
            // Don't call showNextProgressiveMessage here - let the useEffect handle it
          } else {
            // Fallback to old script format
            setMessages([
              {
                role: "assistant",
                content: initialScene.script,
                timestamp: new Date().toLocaleTimeString(),
                showButtons: true,
              },
            ]);
          }

          // Check for auto action in the initial scene
          if (initialScene.autoAction) {
            handleAutoAction(initialScene.autoAction);
          }
        }
      })
      .catch((error) => console.error("Error loading scenes:", error));
  }, []);

  // Effect to update current scene data when scenes are loaded
  useEffect(() => {
    if (scenesLoaded && scenes.length > 0) {
      updateCurrentSceneData(currentScene);
    }
  }, [scenesLoaded, scenes, currentScene]);

  // Function to show progressive messages with delays
  const showNextProgressiveMessage = () => {
    const currentSceneMessages = sceneProgressiveMessages[currentScene] || [];

    // Safety check: if no messages for current scene, stop execution
    if (!currentSceneMessages || currentSceneMessages.length === 0) {
      setIsShowingProgressive(false);
      setCurrentProgressiveIndex(0);
      return;
    }

    // Safety check: if index is out of bounds, reset
    if (currentProgressiveIndex >= currentSceneMessages.length) {
      setIsShowingProgressive(false);
      setCurrentProgressiveIndex(0);
      return;
    }

    const currentMessage = currentSceneMessages[currentProgressiveIndex];

    // Check if message has text, image, video, or audio property
    if (!currentMessage.text && !currentMessage.image && !currentMessage.video && !currentMessage.audio) {
      // Skip this message and move to next
      if (currentProgressiveIndex < currentSceneMessages.length - 1) {
        const nextIndex = currentProgressiveIndex + 1;
        setTimeout(() => {
          setCurrentProgressiveIndex(nextIndex);
        }, currentMessage.delay || 2000);
      }
      return;
    }

    // Add the current message
    // Handle text randomization - if text is an array, randomly select one
    const chosenText = Array.isArray(currentMessage.text)
      ? currentMessage.text[Math.floor(Math.random() * currentMessage.text.length)]
      : currentMessage.text;

    const newMessage = {
      role: "assistant",
      content: chosenText || "",
      timestamp: new Date().toLocaleTimeString(),
      showButtons: currentProgressiveIndex === currentSceneMessages.length - 1, // Only show buttons on last message
      expectInput: currentMessage.expectInput || false,
      aiReplyTemplate: currentMessage.aiReplyTemplate || null,
      // Add media properties if they exist
      ...(currentMessage.image && { image: currentMessage.image }),
      ...(currentMessage.video && { video: currentMessage.video }),
      ...(currentMessage.audio && { audio: currentMessage.audio }),
    };

    addMessageWithoutDuplicate(newMessage);

    // Check if this message expects input
    if (currentMessage.expectInput) {
      // Pause progression and wait for user input
      setIsShowingProgressive(false);
      return;
    }

    // Move to next message after delay
    if (currentProgressiveIndex < currentSceneMessages.length - 1) {
      const nextIndex = currentProgressiveIndex + 1;
      setTimeout(() => {
        setCurrentProgressiveIndex(nextIndex);
      }, currentMessage.delay || 2000);
    } else {
      // All messages shown, stop progressive mode
      setIsShowingProgressive(false);
      setCurrentProgressiveIndex(0);

      // Only show buttons when naturally completing the scene (not after interruption)
      if (!wasInterrupted) {
        setMessages(prev => {
          const updatedMessages = [...prev];
          // Find the last message from this scene and ensure it shows buttons
          for (let i = updatedMessages.length - 1; i >= 0; i--) {
            if (updatedMessages[i].role === "assistant" && updatedMessages[i].content === chosenText) {
              updatedMessages[i] = { ...updatedMessages[i], showButtons: true };
              break;
            }
          }
          return updatedMessages;
        });
      } else {
        // Reset the interruption flag since we've completed the scene
        setWasInterrupted(false);
      }
    }
  };

  // Single effect to handle progressive message display
  useEffect(() => {
    const currentSceneMessages = sceneProgressiveMessages[currentScene] || [];

    // Only trigger if we're actually in progressive mode and have messages to show
    if (isShowingProgressive && currentSceneMessages.length > 0 && currentProgressiveIndex < currentSceneMessages.length) {
      showNextProgressiveMessage();
    }
  }, [currentProgressiveIndex, isShowingProgressive, currentScene, sceneProgressiveMessages]);

  // Effect to handle scene changes - no need to clear arrays anymore
  useEffect(() => {
    if (scenesLoaded && currentScene !== 0) {
      // Clear any existing auto action timer
      clearAutoActionTimer();

      // Reset index for new scene
      setCurrentProgressiveIndex(0);
      setIsShowingProgressive(false);
      setWasInterrupted(false); // Reset interruption flag for new scene

      // Update current scene data and button texts for new scene
      updateCurrentSceneData(currentScene);

      // Check if this scene has progressive messages
      const currentSceneMessages = sceneProgressiveMessages[currentScene] || [];
      if (currentSceneMessages.length > 0) {
        // Start progressive mode for this scene
        setTimeout(() => {
          setIsShowingProgressive(true);
        }, 100);
      }

      // Check for auto action in the current scene
      const sceneData = scenes.find((scene) => scene.id === currentScene);
      if (sceneData && sceneData.autoAction) {
        handleAutoAction(sceneData.autoAction);
      }
    }
  }, [currentScene, scenesLoaded, sceneProgressiveMessages]);

  // Cleanup effect for auto action timer
  useEffect(() => {
    return () => {
      clearAutoActionTimer();
    };
  }, []);

  // Effect to start progressive messages when they're set
  useEffect(() => {
    const currentSceneMessages = sceneProgressiveMessages[currentScene] || [];
    if (currentSceneMessages.length > 0 && isShowingProgressive && currentProgressiveIndex === 0) {

      const timer = setTimeout(() => {
        if (isShowingProgressive && currentProgressiveIndex === 0) {

          showNextProgressiveMessage();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentScene, sceneProgressiveMessages, isShowingProgressive, currentProgressiveIndex]);

  // Function to clear all chat state for a new scene (only used when explicitly needed)
  const clearChatForNewScene = () => {
    setMessages([]);
    setCurrentProgressiveIndex(0);
    setIsShowingProgressive(false);
    // Note: sceneProgressiveMessages are kept - no need to clear them
  };

  // Image zoom and pan functions
  const openImageModal = (imageSrc) => {
    logger.log('MEDIA', 'image_view', { src: imageSrc }, currentScene);
    setSelectedImage(imageSrc);
    setShowImageModal(true);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleImageZoom = (delta) => {
    setImageScale(prev => {
      const newScale = prev + delta;
      return Math.max(0.5, Math.min(5, newScale)); // Limit zoom between 0.5x and 5x
    });
  };

  const handleImageWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    handleImageZoom(delta);
  };

  const handleImageMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleImageMouseMove = (e) => {
    if (isDragging) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const resetImageTransform = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // Touch support for mobile devices
  const handleImageTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX - imagePosition.x,
        y: touch.clientY - imagePosition.y
      });
    }
  };

  const handleImageTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setImagePosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  const handleImageTouchEnd = () => {
    setIsDragging(false);
  };

  // Function to add message without duplicates
  const addMessageWithoutDuplicate = (newMessage) => {
    setMessages(prev => {
      // Check if this message already exists (same content and role)
      const isDuplicate = prev.some(msg =>
        msg.role === newMessage.role &&
        msg.content === newMessage.content &&
        msg.image === newMessage.image &&
        msg.video === newMessage.video &&
        msg.audio === newMessage.audio
      );

      if (isDuplicate) {
        return prev;
      }

      return [...prev, newMessage];
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to get current scene data
  const getCurrentSceneData = () => {
    return scenes.find((scene) => scene.id === currentScene);
  };

  // Helper function to randomly select from scriptAlt arrays
  const getRandomScript = (scene) => {
    if (scene.scriptAlt && scene.scriptAlt.length > 0) {
      const randomIndex = Math.floor(Math.random() * scene.scriptAlt.length);
      return scene.scriptAlt[randomIndex];
    }
    return scene.script || "Script tidak tersedia";
  };

  // Function to update current scene data and button texts
  const updateCurrentSceneData = (sceneId) => {
    const sceneData = scenes.find((scene) => scene.id === sceneId);
    if (sceneData) {
      setCurrentSceneData(sceneData);

      // Pre-calculate button texts to avoid recalculation on every render
      const buttonTexts = {};
      if (sceneData.yesAction) {
        buttonTexts.yes = sceneData.yesAction.text;
      }
      if (sceneData.noAction) {
        buttonTexts.no = sceneData.noAction.text;
      }
      if (sceneData.otherAction) {
        buttonTexts.other = sceneData.otherAction.text;
      }
      setCurrentButtonTexts(buttonTexts);
    }
  };

  // Helper function to create media messages
  const createMediaMessages = (mediaArray) => {
    const messages = mediaArray.map((media) => {
      const message = {
        role: "assistant",
        content: media.description,
        [media.type]: media.filePath,
        timestamp: new Date().toLocaleTimeString(),
        showButtons: false,
      };
      return message;
    });
    return messages;
  };

  // Helper function to handle scene actions
  const handleSceneAction = (action) => {
    if (action.type === "nextScene") {
      setCurrentScene(action.target);
      return true; // Indicates scene changed
    } else if (action.type === "redirect") {
      router.push(action.target);
      return false; // No scene change needed
    } else if (action.type === "navigate") {
      router.push(action.target);
      return false; // No scene change needed
    } else if (action.type === "stayInScene") {
      return false; // No scene change needed
    }
    return false;
  };

  // Function to handle auto actions
  const handleAutoAction = (autoAction) => {
    if (!autoAction) return;

    // Clear any existing timer
    if (autoActionTimer) {
      clearTimeout(autoActionTimer);
    }

    if (autoAction.type === "autoNext") {
      const timer = setTimeout(() => {
        setCurrentScene(autoAction.target);
        setAutoActionTimer(null);
      }, autoAction.delay || 5000);

      setAutoActionTimer(timer);
    }
  };

  // Function to clear auto action timer
  const clearAutoActionTimer = () => {
    if (autoActionTimer) {
      clearTimeout(autoActionTimer);
      setAutoActionTimer(null);
    }
  };

  const handleYesNoResponse = async (response, messageIndex) => {
    // Log intent
    logger.log('NARRATIVE', 'choice_intent', { option: response, scene: currentScene }, currentScene);

    // Get the actual button text to display in the chat
    const sceneData = currentSceneData;
    let buttonText = response;

    if (response === "Iya" && sceneData?.yesAction?.text) {
      buttonText = sceneData.yesAction.text;
    } else if (response === "Tae" && sceneData?.noAction?.text) {
      buttonText = sceneData.noAction.text;
    }

    const userMessage = {
      role: "user",
      content: buttonText,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Hide buttons from all previous messages
    setMessages((prev) =>
      prev.map((msg, index) =>
        index <= messageIndex ? { ...msg, showButtons: false } : msg
      )
    );

    // Clear any auto action timer when user interacts
    clearAutoActionTimer();

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    if (!currentSceneData) {
      setIsLoading(false);
      return;
    }

    // Ensure scenes are loaded before proceeding
    if (scenes.length === 0) {
      setIsLoading(false);
      return;
    }

    // Handle response based on scene data
    let action;
    if (response === "Iya") {
      action = currentSceneData.yesAction;
    } else if (response === "Tae") {
      action = currentSceneData.noAction;
      // If noAction doesn't exist, skip to next scene or handle gracefully
      if (!action) {
        // Try to find the next scene or go to a default
        const nextSceneId = currentSceneData.id + 1;
        const nextScene = scenes.find((scene) => scene.id === nextSceneId);
        if (nextScene) {
          setCurrentScene(nextSceneId);
          setConversationState(`scene${nextSceneId}_after_skip`);
          // Add a message indicating the skip
          const skipMessage = {
            role: "assistant",
            content: t.letsContinue,
            timestamp: new Date().toLocaleTimeString(),
            showButtons: false,
          };
          setMessages((prev) => [...prev, skipMessage]);
          setIsLoading(false);
          return;
        }
      }
    }

    // Handle redirect actions immediately - before any other processing
    if (action && action.type === "redirect") {
      // Check if this is scene 11 (the last scene) and show survey modal
      if (currentScene === 11) {
        setPendingRedirectTarget(action.target);
        setShowSurveyModal(true);
        return;
      }
      router.push(action.target);
      return;
    }

    if (action && action.type === "navigate") {
      // Handle navigation immediately
      router.push(action.target);
      return;
    }



    // Get target scene data for next scene transitions
    let targetSceneData = null;
    if (action && action.type === "nextScene") {
      targetSceneData = scenes.find((scene) => scene.id === action.target);
    }

    // Create media messages from target scene if transitioning
    let newMessages = [];
    if (
      targetSceneData &&
      targetSceneData.media &&
      targetSceneData.media.length > 0
    ) {
      newMessages = createMediaMessages(targetSceneData.media);
    }

    // Add conditional response for "Tae" (tidak) - only if noAction exists
    // Removed the "Baiklah kalau begitu" message

    // Add script message from target scene (or current scene if staying)
    let scriptMessage = null;

    if (targetSceneData) {
      // Check if target scene has progressive messages
      if (targetSceneData.messages && targetSceneData.messages.length > 0) {
        // Reset progressive state for new scene
        setCurrentProgressiveIndex(0);
        setIsShowingProgressive(false);

        // Progressive messages are already loaded in sceneProgressiveMessages

        // Start progressive mode after a short delay
        setTimeout(() => {
          setIsShowingProgressive(true);
        }, 150);

        // Don't add script message yet - progressive system will handle it
        scriptMessage = null;
      } else {
        // No progressive messages, use regular script
        scriptMessage = {
          role: "assistant",
          content: targetSceneData.script,
          timestamp: new Date().toLocaleTimeString(),
          showButtons: true,
        };
      }
    } else {
      // No target scene, use current scene
      scriptMessage = {
        role: "assistant",
        content: currentSceneData.script,
        timestamp: new Date().toLocaleTimeString(),
        showButtons: false,
        timestamp: new Date().toLocaleTimeString()
      };

      // Fix: wait, duplicate key timestamp above.
    }

    // Add all messages (only if scriptMessage exists)
    if (scriptMessage) {
      setMessages((prev) => [...prev, ...newMessages, scriptMessage]);
    } else {
      // Only add media messages if no script message
      setMessages((prev) => [...prev, ...newMessages]);
    }

    // Handle scene transition
    if (action && action.type === "nextScene") {
      setCurrentScene(action.target);

      // LOG Scene Transition
      logger.log('NARRATIVE', 'scene_transition', { from: currentScene, to: action.target, action: response }, action.target);

      // Update current scene data and button texts for new scene
      updateCurrentSceneData(action.target);
      setConversationState(
        `scene${action.target}_after_${response === "Iya" ? "yes" : "no"}`
      );

      // Check for auto action in the new scene
      const newSceneData = scenes.find((scene) => scene.id === action.target);
      if (newSceneData && newSceneData.autoAction) {
        handleAutoAction(newSceneData.autoAction);
      }
    } else {
      setConversationState(`scene${currentScene}_continued`);
      logger.log('NARRATIVE', 'scene_stay', { scene: currentScene, action: response }, currentScene);
    }

    setIsLoading(false);
  };



  // Function to resume progressive messages after user input
  const resumeProgressiveMessages = () => {
    const currentSceneMessages = sceneProgressiveMessages[currentScene] || [];

    // Safety check: if no messages for current scene, stop execution
    if (!currentSceneMessages || currentSceneMessages.length === 0) {
      setIsShowingProgressive(false);
      setCurrentProgressiveIndex(0);
      return;
    }

    if (currentProgressiveIndex < currentSceneMessages.length - 1) {
      // Move to next message index first
      setCurrentProgressiveIndex(prev => prev + 1);
      // Then enable progressive mode
      setIsShowingProgressive(true);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check if we're in a progressive message that expects input
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.expectInput) {
      // Add user message
      const userMessage = {
        role: "user",
        content: inputMessage,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, userMessage]);
      logger.log('CHAT', 'message_sent_progressive', { content: inputMessage }, currentScene);

      // Add AI reply if template exists
      if (lastMessage.aiReplyTemplate) {
        const aiReply = {
          role: "assistant",
          content: lastMessage.aiReplyTemplate,
          timestamp: new Date().toLocaleTimeString(),
          showButtons: false,
        };
        setMessages(prev => [...prev, aiReply]);
        logger.log('CHAT', 'ai_reply_template', { content: lastMessage.aiReplyTemplate }, currentScene);
      }

      // Resume progressive messages
      setTimeout(() => {
        resumeProgressiveMessages();
      }, 1000);

      setInputMessage("");
      return;
    }

    // Determine the actual current scene from conversation state
    let actualCurrentScene = currentScene;
    if (
      conversationState &&
      conversationState.includes("scene") &&
      conversationState.includes("_after_")
    ) {
      const sceneMatch = conversationState.match(/scene(\d+)_after_/);
      if (sceneMatch) {
        actualCurrentScene = parseInt(sceneMatch[1]);
      }
    }

    const userMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Hide buttons from all previous messages when user interrupts
    setMessages((prev) => prev.map((msg) => ({ ...msg, showButtons: false })));

    // Mark that the progressive flow was interrupted
    setWasInterrupted(true);
    logger.log('CHAT', 'interruption', { content: inputMessage }, actualCurrentScene);

    // Clear any auto action timer when user interacts
    clearAutoActionTimer();

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    logger.log('CHAT', 'message_sent', { content: inputMessage }, actualCurrentScene);

    try {
      const apiResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          history: messages,
          currentScene: actualCurrentScene,
          currentProgressiveIndex,
          conversationState: conversationState,
          character: "pajonga",
          language: currentLanguage,
        }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(
          data.error || data.details || "Gagal mendapatkan respons"
        );
      }

      // For custom questions, AI response includes everything (answer + scene context + question)
      if (data.message && data.message.trim()) {
        const aiMessage = {
          role: "assistant",
          content: data.message,
          timestamp: new Date().toLocaleTimeString(),
          showButtons: false, // Don't show buttons on AI response
        };
        setMessages((prev) => [...prev, aiMessage]);
        logger.log('CHAT', 'ai_response', { content: data.message }, actualCurrentScene);

        // Then add a simple message to continue the story
        setTimeout(() => {
          const sceneQuestionMessage = {
            role: "assistant",
            content: "Baik, sekarang mari kita lanjutkan ceritanya. Apa yang ingin kamu lakukan?",
            timestamp: new Date().toLocaleTimeString(),
            showButtons: true, // Show buttons on the scene question
          };

          setMessages((prev) => [...prev, sceneQuestionMessage]);

          // Update conversation state to reflect returning to scene
          setConversationState(`scene${actualCurrentScene}_returned`);

          // Reset interruption flag so suggestion box can appear
          setWasInterrupted(false);
        }, 1000); // Wait 1 second before showing the scene question

        // Update conversation state to reflect the AI response
        setConversationState(`scene${actualCurrentScene}_after_custom_response`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      logger.log('SYSTEM', 'chat_error', { error: error.message }, actualCurrentScene);
      const errorMessage = {
        role: "assistant",
        content: `${t.errorMessage} ${error.message}. ${error.message.includes("OPENAI_API_KEY")
          ? t.checkApiKey
          : t.tryAgain
          } ${t.wantToTryAgain}`,
        timestamp: new Date().toLocaleTimeString(),
        showButtons: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get the latest assistant message index
  const getLatestAssistantMessageIndex = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return i;
      }
    }
    return -1;
  };

  const latestAssistantIndex = getLatestAssistantMessageIndex();

  const [chatStarted, setChatStarted] = useState(false);

  return (
    <div className="h-full w-full bg-white">
      {chatStarted ? (
        <div className="flex flex-col h-screen max-w-4xl mx-auto md:max-w-6xl lg:max-w-7xl xl:max-w-8xl">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 md:px-6 lg:px-8 py-4 md:py-6 justify-between border-b">
            <div className="flex gap-4 items-center ">
              <img
                src="/images/pajonga-avatar.png"
                alt="logo"
                className="w-10 h-10"
              />
              <div className="text-black font-bold text-2xl">
                Pajonga
              </div>
              <div className="flex items-center ml-auto gap-2">
                <img
                  src="/images/close.png"
                  alt="logo"
                  className="w-9 h-9 cursor-pointer"
                  onClick={() => router.push("/")}
                />
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6 border-t border-black">
            {messages.map((message, index) => (
              <div key={index}>
                <div
                  className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  <div className="flex gap-2 md:gap-3 items-end">
                    <img
                      src="/images/pajonga-avatar.png"
                      className={`w-8 h-8 md:w-10 md:h-10 ${message.role === "user" ? "hidden" : "block"
                        }`}
                    />
                    <div
                      className={`max-w-[95%] md:max-w-[85%] lg:max-w-[75%] rounded-lg px-3 py-3 md:px-4 md:py-4 tracking-wider ${message.role === "user"
                        ? "bg-[#DBE8F5] text-black px-3 py-2 rounded-full font-medium"
                        : "bg-[#D9D9D9] text-black font-medium"
                        }`}
                    >
                      <p className="text-sm md:text-base lg:text-lg whitespace-pre-wrap">
                        {message.content}
                      </p>

                      {/* Video in chat bubble */}
                      {message.video && (
                        <div className="mt-1">
                          <video
                            ref={videoRef}
                            className="w-full h-auto rounded-lg"
                            controls
                            preload="metadata"
                            onPlay={() => logger.log('MEDIA', 'video_play', { src: message.video }, currentScene)}
                            onPause={() => logger.log('MEDIA', 'video_pause', { src: message.video }, currentScene)}
                            onEnded={() => logger.log('MEDIA', 'video_end', { src: message.video }, currentScene)}
                            onError={(e) => {
                              console.error("Video error:", e);
                              logger.log('SYSTEM', 'video_error', { src: message.video, error: e.toString() }, currentScene);
                            }}
                          >
                            <source src={message.video} type="video/mp4" />
                            {t.sorryVideoError}
                          </video>
                        </div>
                      )}

                      {/* Audio in chat bubble */}
                      {message.audio && (
                        <div className="mt-1">
                          <audio
                            className="w-full"
                            controls
                            onPlay={() => logger.log('MEDIA', 'audio_play', { src: message.audio }, currentScene)}
                            onPause={() => logger.log('MEDIA', 'audio_pause', { src: message.audio }, currentScene)}
                            onEnded={() => logger.log('MEDIA', 'audio_end', { src: message.audio }, currentScene)}
                            onError={(e) => {
                              console.error("Audio error:", e);
                              logger.log('SYSTEM', 'audio_error', { src: message.audio, error: e.toString() }, currentScene);
                            }}
                          >
                            <source src={message.audio} type="audio/mpeg" />
                            {t.sorryAudioError}
                          </audio>
                        </div>
                      )}

                      {/* Image in chat bubble */}
                      {message.image && (
                        <div className="mt-1">
                          <img
                            src={message.image}
                            alt="Media content"
                            className="w-full h-auto rounded-lg max-w-md cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openImageModal(message.image)}
                            onError={(e) => {
                              console.error("Image error:", e);
                            }}
                          />
                        </div>
                      )}

                      {/* PDF Button in chat bubble */}
                      {message.pdf && (
                        <div className="mt-1">
                          <button
                            onClick={() => setShowPdfModal(true)}
                            className="flex items-center space-x-3 bg-gray-100 hover:bg-gray-200 rounded-lg p-3 w-full transition-colors"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-12 h-16 bg-red-500 rounded flex items-center justify-center">
                                <svg
                                  className="w-6 h-6 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-gray-900">
                                {t.readMore}
                              </p>
                              <p className="text-sm text-gray-500">
                                {t.pajongaDocumentDescription}
                              </p>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Suggestion Box - only show for the latest assistant message */}
                {message.role === "assistant" &&
                  message.showButtons &&
                  !isLoading &&
                  index === latestAssistantIndex && (
                    <div className="flex flex-col gap-[1svh] w-full mt-2">
                      <div className="text-sm md:text-base lg:text-lg text-gray-600 mb-2 font-medium">
                        Suggestion:
                      </div>
                      <div className="flex flex-wrap gap-[1svh] md:gap-[1vw] lg:gap-[0.8vw] justify-center md:justify-start">
                        {/* Yes option - always show if yesAction exists */}
                        {currentSceneData?.yesAction && (
                          <button
                            onClick={() => handleYesNoResponse("Iya", index)}
                            className="bg-[#DBE8F5] text-black px-[2svh] md:px-[2vw] lg:px-[1.5vw] py-[0.5svh] md:py-[0.4vw] lg:py-[0.3vw] rounded-full font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors hover:bg-[#C5D8E8] text-sm md:text-base lg:text-lg hover:scale-105 transform duration-200"
                          >
                            {currentButtonTexts.yes || "Iya"}
                          </button>
                        )}
                        {/* No option - only show if noAction exists */}
                        {currentSceneData?.noAction && (
                          <button
                            onClick={() => handleYesNoResponse("Tae", index)}
                            className="bg-[#DBE8F5] text-black px-[2svh] md:px-[2vw] lg:px-[1.5vw] py-[0.5svh] md:py-[0.4vw] lg:py-[0.3vw] rounded-full font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors hover:bg-[#C5D8E8] text-sm md:text-base lg:text-lg hover:scale-105 transform duration-200"
                          >
                            {currentButtonTexts.no || "Tidak"}
                          </button>
                        )}
                        {/* Other option - show if otherAction exists */}
                        {currentSceneData?.otherAction && (
                          <button
                            onClick={() => setShowCustomInput(true)}
                            className="bg-gray-200 text-black px-[2svh] md:px-[2vw] lg:px-[1.5vw] py-[0.5svh] md:py-[0.4vw] lg:py-[0.3vw] rounded-full font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors hover:bg-gray-300 text-sm md:text-base lg:text-lg border border-gray-400 hover:scale-105 transform duration-200"
                          >
                            {currentButtonTexts.other || "Chat dengan AI"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}


              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm md:text-base lg:text-lg text-gray-500">
                      {t.pajongaTyping}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Always visible */}
          <div className="bg-[#A3A2A2] px-3 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
            <div className="flex space-x-2 md:space-x-4 lg:space-x-6 items-center">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  messages.length > 0 &&
                    messages[messages.length - 1]?.expectInput
                    ? "Tulis jawabanmu di sini..."
                    : t.talkWithPajonga
                }
                className="flex-1 border bg-white text-black border-none rounded-lg px-3 py-2 md:px-4 md:py-3 lg:px-6 lg:py-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-sm md:text-base"
                rows="1"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={`px-3 py-2 md:px-4 md:py-2 lg:px-6 lg:py-3 rounded-lg font-medium transition-colors text-sm md:text-base ${messages.length > 0 &&
                  messages[messages.length - 1]?.expectInput
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-[#DBE8F5] text-black hover:bg-[#C5D8E8]"
                  } ${(!inputMessage.trim() || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {messages.length > 0 &&
                  messages[messages.length - 1]?.expectInput
                  ? "Kirim"
                  : t.send}
              </button>
            </div>
          </div>

          {showPdfModal && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowPdfModal(false)}
            >
              <div
                className="bg-white rounded-lg w-4/5 md:w-3/5 lg:w-2/3 h-4/5 md:h-3/4 lg:h-2/3 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-4 md:p-6 border-b">
                  <div></div>
                  <button
                    onClick={() => setShowPdfModal(false)}
                    className="text-gray-500 hover:text-gray-700 p-1 md:p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <svg
                      className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="flex-1">
                  <iframe
                    src={`${currentSceneData?.media?.find(m => m.type === 'pdf')?.filePath || '/Scene-2-Book.pdf'}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-0"
                    title="PDF Document"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Image Zoom Modal */}
          {showImageModal && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-90"
              onClick={closeImageModal}
            >
              {/* Close button */}
              <button
                onClick={closeImageModal}
                className="absolute top-4 md:top-6 lg:top-8 right-4 md:right-6 lg:right-8 z-10 text-white hover:text-gray-300 transition-colors p-1 md:p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
              >
                <svg
                  className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>



              {/* Image container with zoom and pan */}
              <div
                className="relative overflow-hidden cursor-grab active:cursor-grabbing"
                onWheel={handleImageWheel}
                onMouseDown={handleImageMouseDown}
                onMouseMove={handleImageMouseMove}
                onMouseUp={handleImageMouseUp}
                onMouseLeave={handleImageMouseUp}
                onTouchStart={handleImageTouchStart}
                onTouchMove={handleImageTouchMove}
                onTouchEnd={handleImageTouchEnd}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedImage}
                  alt="Zoomed image"
                  className="max-w-none select-none"
                  style={{
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                  draggable={false}
                />
              </div>

              {/* Zoom level indicator */}
              <div className="absolute bottom-4 md:bottom-6 lg:bottom-8 left-4 md:left-6 lg:left-8 z-10 bg-white bg-opacity-20 text-white px-3 py-2 md:px-4 md:py-3 rounded-lg text-sm md:text-base">
                {Math.round(imageScale * 100)}%
              </div>
            </div>
          )}

          {/* Custom Input Modal */}
          {showCustomInput && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-4/5 md:w-3/5 lg:w-2/5 max-w-md flex flex-col">
                <div className="flex justify-between items-center p-4 md:p-6 border-b">
                  <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-black">
                    Tulis Pesan Sendiri
                  </h3>
                  <button
                    onClick={() => setShowCustomInput(false)}
                    className="text-gray-500 hover:text-gray-700 p-1 md:p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <svg
                      className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="p-4 md:p-6">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Tulis pesan Anda di sini..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 md:px-4 md:py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-black text-sm md:text-base"
                    rows="4"
                  />
                  <div className="flex justify-end gap-2 md:gap-3 mt-4 md:mt-6">
                    <button
                      onClick={() => setShowCustomInput(false)}
                      className="px-4 py-2 md:px-5 md:py-3 text-black border border-gray-300 rounded-lg hover:bg-gray-50 text-sm md:text-base transition-colors duration-200"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (inputMessage.trim()) {
                          sendMessage();
                          setShowCustomInput(false);
                        }
                      }}
                      disabled={!inputMessage.trim()}
                      className="px-4 py-2 md:px-5 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base transition-colors duration-200"
                    >
                      Kirim
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-screen relative text-center flex flex-col items-center justify-center">
          <Navigation />

          <div
            className={`absolute left-0 flex justify-center items-center bottom-[3svh] text-[3svw] md:text-[2.5vw] lg:text-[2vw] text-black w-full font-normal transition-opacity duration-1000 ease-in-out`}
          >
            {t.copyright}
          </div>

          <div className="mt-[10svh] md:mt-[8vh] lg:mt-[6vh] mb-[10svh] md:mb-[8vh] lg:mb-[6vh]">
            <div className="text-black text-[5.2svw] md:text-[4vw] lg:text-[3.5vw] font-bold tracking-wide mb-[1svw] md:mb-[0.5vw]">
              {t.pajongaTitle}
            </div>
            <div className="text-black text-[3.5svw] md:text-[2.5vw] lg:text-[2vw] font-semibold">
              {t.pajongaSubtitle}
            </div>
          </div>


          <div className="mb-[4svh] md:mb-[3vh] lg:mb-[2vh]">
            <img src="/images/patung-hasanudin.png" className="h-[25svh] md:h-[20vh] lg:h-[15vh]" />
          </div>

          <div
            onClick={() => setChatStarted(true)}
            className="cursor-pointer bg-[#7E96B2] tracking-wider text-white px-[5svw] md:px-[4vw] lg:px-[3vw] pt-[.5svw] md:pt-[0.4vw] pb-[1.2svw] md:pb-[1vw] rounded-lg text-[5.3svw] md:text-[4vw] lg:text-[3vw] w-fit hover:bg-[#6A85A0] transition-colors duration-200"
          >
            {t.startConversation}
          </div>
          <div className="flex flex-col gap-[.5svh] md:gap-[0.4vh] items-center text-black mt-[3svh] md:mt-[2vh] font-semibold">
            <div className="text-[3.5svw] md:text-[2.5vw] lg:text-[2vw]">{t.pleaseUseHeadphones}</div>
            <div>
              <img src="/images/headphone.png" className="h-[7svw] md:h-[5vw] lg:h-[4vw]" />
            </div>
          </div>
        </div>
      )}

      {/* Location Tracker */}
      <LocationTracker currentScene={currentScene} />

      {/* Survey Modal */}
      {showSurveyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                {currentLanguage === 'en' ? 'Feedback Survey' : 'Survei Umpan Balik'}
              </h2>
              <button
                onClick={() => {
                  setShowSurveyModal(false);
                  if (pendingRedirectTarget) {
                    router.push(pendingRedirectTarget);
                    setPendingRedirectTarget(null);
                  }
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <iframe
                src="https://docs.google.com/forms/d/e/1FAIpQLSdpOisftkMyYMCmjTeX60x3wDf6kMebbNUTLPOaJbFM1EkBsQ/viewform?embedded=true"
                width="100%"
                height="600"
                frameBorder="0"
                marginHeight="0"
                marginWidth="0"
                title="Feedback Survey"
              >
                {currentLanguage === 'en' ? 'Loading...' : 'Memuat…'}
              </iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
