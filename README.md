
# Drektopia-hello

## Overview

This application is meant to add a bit of fun and functionality to any subreddit it's installed on. It can generate AI created content via OpenAI's ChatCompletion endpoint, with a set of safety measures. At time of writing, you can test the application on the sub /r/Drektopia.

## Key Features

1. **AI Generated Responses:** The application can randomly respond to posted comments on the sub, similar to the comedy bots seen in, for example, /r/EnoughMuskSpam.

2. **Command Responses:** The application can also respond to specific user !commands. These commands trigger AI generated content, with the context being the previous comment or post. 

    - A dozen built-in commands offer a range of fun and/or useful functions, with more easily possible.  Examples include !tldr, !unslang, !haiku, and !gungan.  The idea is allow a limited range of AI content generation in a sub, without opening the store to strange prompts from strange people.

    - An available user action provides a list of commands to users via PM, acting as a built-in help file. A special !help command outputs to a comment.

    - For the future, CRUD operations on commands in the settings would be warrented, so that installers of the app could add, edit, and delete their own sub-specfic set of commands. Also, for the future, it would be nice to have a single user action that pulls up a dialog box with command buttons.

3. **Summarization** The application can automatically summarize long comments and posts that go over a theshold of characters, simialr to the summarization bot on /r/ChatGPT.

4. **Safety Measures:** Several safeguards are in place to maintain a respectful environment and help prevent token misuse:

    - **Rate Limiting:** The app features both hourly and daily rate limits. Future iterations may also include user-based rate limiting.
    - **Anti-Injection Protection:** Built-in promptcrafting reduces the risk of the AI model being "jailbroken" by user comments.
    - **Content Moderation:** User content is first sent to OpenAI's moderation endpoint to ensure compliance with guidelines. (and also so that ChatGPT doesn't have to blush at adult-themed content)
    - **Comment Blocking:** Moderators have the ability to block the app from commenting on selected posts via a moderator action, maintaining appropriateness in sensitive threads.
    - **Length Limit:** A setting is available to prevent the app from responding to messages over a certain length, helping to prevent unnecessary token usage.

