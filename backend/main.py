from ollama import Client
import time

client = Client()

print("Hello! I am the E-Games Assistant.")

while True:
    user_text = input("\nYou: ")

    if user_text.lower() in ["exit", "quit"]:
        print("Velune the E-Games Assistant: Goodbye!")
        break

    print("Velune: ", end=" ")

    for chunk in client.chat(
        model="sciefy", 
        messages=[
            {"role": "system", "content": "You are an assistant specialized in E-Games."},
            {"role": "user", "content": user_text}
        ],
        stream=True
    ):
        if "message" in chunk and "content" in chunk["message"]:
            print(chunk["message"]["content"], end="", flush=True)
            time.sleep(0.01)

    print()