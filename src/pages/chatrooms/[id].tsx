import type { NextPage } from "next";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { api } from "~/utils/api";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
let socket: Socket;

const Chatroom: NextPage = () => {
  return (
    <div>
      <Messages />
    </div>
  );
};
export default Chatroom;

const Messages: React.FC = () => {
  const router = useRouter();
  const { id: chatroomId } = router.query;
  const { data: sessionData, status } = useSession();

  const [messageInput, setMessageInput] = React.useState("");

  const { data: messages, refetch: refetchMessages } =
    api.message.getAll.useQuery(
      { chatroomId: chatroomId?.toString() ?? "" },
      {
        enabled: sessionData?.user !== undefined,
      }
    );
  const { data: chatroom } = api.chatroom.getRoom.useQuery({
    id: chatroomId?.toString() ?? "",
  });

  const createMessage = api.message.create.useMutation({
    onSuccess: () => {
      socket.emit("update-messages", "yay!");
      void refetchMessages();
    },
  });
  const deleteMessage = api.message.delete.useMutation({
    onSuccess: () => {
      void socket.emit("update-messages", "yay!");
    },
  });

  //is typing idicator
  const [isTypingText, setIsTypingText] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsTypingText("");
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isTypingText]);

  //socket stuff
  useEffect(() => void socketInitializer(), []);

  const socketInitializer = async () => {
    await fetch("/api/socket");
    socket = io();

    socket.on("connect", () => {
      console.log("connected");
    });

    socket.on("update-messages", () => {
      void refetchMessages();
      console.log("socket message recieved");
    });
    socket.on("user-typing", (msg: string) => {
      setIsTypingText(msg);
    });
  };

  //scroll to bottom of chat when new message is added
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (status === "unauthenticated") {
    return <p>You must be logged in</p>;
  }
  // const handleDeleteMessage = (id: string) => {
  //   void deleteMessage.mutate(
  //     { id: id },
  //     {
  //       onSuccess: () => {
  //         void refetchMessages();
  //       },
  //     }
  //   );
  // };
  return (
    <>
      <div className="p-4">
        <div className="flex w-full justify-between">
          <button
            onClick={() => {
              void router.push("/chatrooms");
            }}
            className="p-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </button>
          <h1 className="p-4 text-2xl">Chatroom Name: {chatroom?.name}</h1>
        </div>

        <div
          className="h-96 overflow-y-auto scroll-smooth border-2"
          ref={chatContainerRef}
        >
          <div className="flex h-96 items-end justify-center border-b-2 border-b-slate-500">
            Start of chat
          </div>
          {messages?.map((message, i) => (
            <div
              key={i}
              className={`flex w-full ${
                message.senderId === sessionData?.user.id
                  ? "flex-row-reverse"
                  : ""
              } gap-2 p-2`}
            >
              <div>
                <Image
                  className="rounded-full"
                  src={message.sender.image ?? ""}
                  alt={message.sender.name ?? ""}
                  width={30}
                  height={30}
                />
              </div>
              <div>
                <p
                  className={`p-2 text-xs ${
                    message.senderId === sessionData?.user.id
                      ? "text-right"
                      : "text-left"
                  } `}
                >
                  {message.sentAt.toLocaleString()}
                </p>
                <div
                  className={`max-w-[20rem] rounded-xl  ${
                    message.senderId === sessionData?.user.id
                      ? "rounded-tr-none bg-blue-500 text-white"
                      : "rounded-tl-none bg-slate-200 text-slate-800"
                  }  p-2 `}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <pre>{isTypingText || " "} </pre>
        <form
          className="flex gap-4 bg-slate-600 p-4"
          onSubmit={(e) => {
            //create new chatroom
            e.preventDefault();

            //clear inputs
            setMessageInput("");

            void createMessage.mutate({
              chatroomId: chatroomId?.toString() ?? "",
              content: messageInput,
            });
          }}
        >
          <input
            type="text"
            className="input-bordered input w-full border-2"
            placeholder="Type your message here..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={() => {
              socket.emit(
                "user-typing",
                `${sessionData?.user.name || ""} is typing...`
              );
            }}
          />

          <button className="rounded bg-blue-500 px-2 text-white" type="submit">
            Send
          </button>
        </form>
      </div>
    </>
  );
};
