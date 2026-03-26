# TODO

## Small things

- [ ] Submitting new messages should scroll to bottom
- [ ] Only show last 10 threads for a given project
- [ ] Show model icons per chat thread in sidebar
- [ ] Add a slight model-colored gradient fading toward the right edge of sidebar chats, grouped with the model icon thread styling
- [ ] Add context usage percentage display below chat input box
- [ ] Improve pending approval tool styling with better contrast for the tool call, monospace text, and a leading tool icon
- [ ] Add a send button above the stop button while an agent chat is running, and remove send-on-Enter so Enter inserts a newline for steering messages
- [ ] Add file upload/attach button, potentially opening a mobile PWA menu for choosing file or photo so iOS can trigger the appropriate picker
- [ ] Add option to paste large text as a file
- [ ] Add voice recording button with waveform display while recording
- [ ] Require the user to enter an OpenAI API key in settings before using voice transcription
- [ ] Add settings toggle to choose basic Whisper transcription or a higher-quality transcript API
- [ ] Add transcript prompt/context step that includes the project file tree and coding-prompt context to improve filename recognition
- [ ] Explore a two-step voice pipeline where a second GPT-5.4 mini or nano pass rewrites transcript filenames using the project file tree
- [ ] Thread archiving
- [ ] New projects should go on top
- [ ] Projects should be sorted by latest thread update
- [ ] Fix project ordering in sidebar persistence so saved sidebar state does not restore projects in the wrong order
- [ ] Add settings option to show last message time beside chat threads instead of first message time
- [ ] Sort chat threads by last message time when that setting is enabled
- [ ] Persist each project's folded/collapsed sidebar state in local storage
- [ ] Add ability to pin up to 3 chats under a project
- [ ] Add button near the top of the chat window to jump to the previous user message
- [ ] Make copy button always visible instead of only showing it on hover
- [ ] Add long-press on mobile to open the chat context menu
- [ ] Alternatively add a three-dots button to open the chat context menu on mobile
- [ ] Add swipe-from-the-left gesture to slide open the sidebar nav on mobile PWA
- [ ] Add sidebar toggle button into settings page so the sidebar can be opened there when it autohides on mobile
- [ ] Add settings option to open the user debug panel, like toggling `?debugUserInput=1`
- [ ] Fix ability to reopen the plan side panel after closing it
- [ ] Add ability to rename project folders (local storage or synced)
- [ ] Fix mobile zoom issue when adding a new project
- [ ] Fix mobile zoom issue when renaming a chat
- [ ] Add in-app toast notifications that link back to finished threads or threads needing input
- [ ] Do not send push notifications for events related to the chat thread currently open in the app
- [ ] Add settings option to toggle whether notifications are suppressed for the currently open chat thread
- [ ] Add settings options for choosing which event types generate notifications
- [ ] Add sound effects for completed turns or needs-input states
- [ ] Add settings toggles to control notification sound effects
- [ ] Add git icon in front of repo name in header
- [ ] Fix question submit button resetting after press
- [ ] Fix bug where old chat threads get stuck with a spinning send button after each message following a server restart
- [ ] Fix terminal scrolling bug on mobile where terminal panes cannot be scrolled on touch devices

## Bigger things

- [ ] Queueing messages
- [ ] Plan how to create an archive chat feature, with an intermediate step of tracking archived threads in local storage and grouping/hiding them at the end of the thread list before a full archive implementation
- [ ] Add plan usage tracker widget for 5h and weekly usage limits for Claude Code and Codex subscription plans
- [ ] Add todo-list / task list viewer component
