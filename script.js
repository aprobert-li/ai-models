document.addEventListener('DOMContentLoaded', () => {
    // ---  ADD YOUR API KEYS HERE  ---
    const YOUR_OPENAI_API_KEY = ""; // Example: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    const YOUR_CLAUDE_API_KEY = ""; // Example: "sk-ant-api03-xxxxxxxxxxxxxxxxxxxx"
    const YOUR_GEMINI_API_KEY = ""; // Example: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    // --- END OF API KEYS ---

    const openAIKey = YOUR_OPENAI_API_KEY.trim();
    const claudeKey = YOUR_CLAUDE_API_KEY.trim();
    const geminiKey = YOUR_GEMINI_API_KEY.trim();
    
    const userPromptInput = document.getElementById('user_prompt');
    const submitBtn = document.getElementById('submit_prompt_btn');
    const submitBtnOpenAI = document.getElementById('submit_prompt_btn_openAI');
    const submitBtnClaude = document.getElementById('submit_prompt_btn_claude');
    const submitBtnGemini = document.getElementById('submit_prompt_btn_gemini');

    const openaiStatusEl = document.getElementById('openai_status');
    const claudeStatusEl = document.getElementById('claude_status');
    const geminiStatusEl = document.getElementById('gemini_status');

    const openaiResponseEl = document.getElementById('openai_response_content');
    const claudeResponseEl = document.getElementById('claude_response_content');
    const geminiResponseEl = document.getElementById('gemini_response_content');

    let openaiMessages = [];
    let claudeMessages = [];
    let geminiChatHistory = [];


    // Functions to make the API calls
    async function callOpenAI(messages, apiKey) {
        const url = "https://api.openai.com/v1/chat/completions";
        const body = JSON.stringify({
            model: "gpt-4o",
            messages: messages,
        });
        const response = await fetch(url, { 
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${apiKey}`
            }, 
            body: body 
        });
        if (!response.ok) { 
            let errorMsg = response.statusText; 
            try { const errorData = await response.json(); 
                errorMsg = errorData.error?.message || errorMsg; 
            } catch (e) {} 
            throw new Error(`OpenAI API Error (${response.status}): ${errorMsg}`);}
        const data = await response.json();
        submitBtn.disabled = false;
        submitBtnOpenAI.disabled = false;
        userPromptInput.disabled = false;
        return data.choices[0].message.content;
    }

    async function callClaude(apiMessages, apiKey) { 
        const url = "https://api.anthropic.com/v1/messages";
        const body = JSON.stringify(
            { 
                model: "claude-3-7-sonnet-20250219", 
                max_tokens: 2048, 
                messages: apiMessages 
            }
        );
        const response = await fetch(url, { 
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json', 
                'x-api-key': apiKey, 
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': "true"
            },
            body: body 
        });
        if (!response.ok) { 
            let errorMsg = response.statusText; 
            try { const errorData = await response.json(); 
                errorMsg = errorData.error?.message || errorData.error?.type || errorMsg; 
            } catch (e) {} 
            throw new Error(`Claude API Error (${response.status}): ${errorMsg}`);
        }
        const data = await response.json();
        if (data.content && data.content.length > 0 && data.content[0].type === "text") { 
            submitBtn.disabled = false;
            submitBtnClaude.disabled = false;
            userPromptInput.disabled = false;
            return data.content[0].text; 
        }
        return "Claude: No text content received.";
    }
    

    async function callGemini(currentChatHistory, apiKey) { // currentChatHistory IS the global geminiChatHistory
        const model = "gemini-2.5-flash-preview-04-17"; 
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
        const body = JSON.stringify({
            contents: currentChatHistory, 
            generationConfig: { "temperature": 0.7, "maxOutputTokens": 2048 }
        });
    
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
        });
    
        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error?.message || errorMsg;
            } catch (e) { }
            
            throw new Error(`Gemini API Error (${response.status}): ${errorMsg}`);
        }
        const data = await response.json();
    
        let textResponse = "Gemini: No valid content received from API."; 
    
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                textResponse = candidate.content.parts[0].text;
            } 
        } 
    
        // Add the model's response (or API feedback message) to the same history array.
        currentChatHistory.push({ role: "model", parts: [{text: textResponse}] });
        submitBtnGemini.disabled = false;
        userPromptInput.disabled = false;
        submitBtn.disabled = false;
        return textResponse;
    }

    // --- Helper: Append User Prompt to UI ---
    function appendUserPromptToUI(element, promptText) {
        const promptDiv = document.createElement('div');
        promptDiv.classList.add('chat-message', 'user-message');
        promptDiv.innerHTML = `<strong>You:</strong><div class="md-content">${marked.parse(promptText)}</div>`;
        element.appendChild(promptDiv);
        element.scrollTop = element.scrollHeight; 
    }

    // --- Helper: Append AI Response to UI ---
    function appendAIResponseToUI(element, text, modelName) {
        const responseDiv = document.createElement('div');
        responseDiv.classList.add('chat-message', 'ai-message');
        responseDiv.innerHTML = `<strong>${modelName}:</strong><div class="md-content">${marked.parse(text)}</div>`;
        element.appendChild(responseDiv);
        hljs.highlightAll(responseDiv); 
        element.scrollTop = element.scrollHeight;
    }

    // --- Helper: Append Error to UI ---
    function appendErrorToUI(element, errorMsg, modelName) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('chat-message', 'ai-message', 'error-message');
        errorDiv.innerHTML = `<strong>${modelName} Error:</strong><p>${errorMsg}</p>`; 
        element.appendChild(errorDiv);
        element.scrollTop = element.scrollHeight;
    }

    submitBtnOpenAI.addEventListener('click', async () => {
        const promptText = userPromptInput.value.trim();
        
        if (!promptText) {
            alert("Please enter a prompt.");
            return;
        }
        if (!openAIKey ) {
            alert("Please ensure at OpenAI API key is set in script.js.");
            return;
        }

        submitBtnOpenAI.disabled = true;
        userPromptInput.disabled = true;

        // Append current user prompt to UI for each active model
        if (openAIKey) appendUserPromptToUI(openaiResponseEl, promptText);
        
        userPromptInput.value = ''; 

        // --- OpenAI Call ---
        if (openAIKey) {
            setLoadingState(openaiStatusEl, true, "ChatGPT (OpenAI)");
            openaiMessages.push({ "role": "user", "content": promptText });
            try {
                const response = await callOpenAI(openaiMessages, openAIKey);
                openaiMessages.push({ "role": "assistant", "content": response });
                appendAIResponseToUI(openaiResponseEl, response, "ChatGPT (OpenAI)");
                setLoadingState(openaiStatusEl, false, "ChatGPT (OpenAI)", true);
            } catch (error) {
                console.error("OpenAI Error:", error);
                appendErrorToUI(openaiResponseEl, error.message, "ChatGPT (OpenAI)");
                setLoadingState(openaiStatusEl, false, "ChatGPT (OpenAI)", false, error.message);
                openaiMessages.pop(); 
            }
        } else {
            openaiStatusEl.textContent = "OpenAI: Key Missing";
            
        }
    });

    submitBtnClaude.addEventListener('click', async () => {
        const promptText = userPromptInput.value.trim();
        
        if (!promptText) {
            alert("Please enter a prompt.");
            return;
        }
        if (!claudeKey) {
            alert("Please ensure the Claude API key is set in script.js.");
            return;
        }

        submitBtnClaude.disabled = true;
        userPromptInput.disabled = true;

        // Append current user prompt to UI for each active model
        if (claudeKey) appendUserPromptToUI(claudeResponseEl, promptText);
        
        userPromptInput.value = ''; 

        // --- Claude Call ---
        if (claudeKey) {
            setLoadingState(claudeStatusEl, true, "Claude");
            const currentClaudeApiMessages = [...claudeMessages, { "role": "user", "content": promptText }];
            try {
                const response = await callClaude(currentClaudeApiMessages, claudeKey);
                claudeMessages.push({ "role": "user", "content": promptText });
                claudeMessages.push({ "role": "assistant", "content": response });
                appendAIResponseToUI(claudeResponseEl, response, "Claude");
                setLoadingState(claudeStatusEl, false, "Claude", true);
            } catch (error) {
                console.error("Claude Error:", error);
                appendErrorToUI(claudeResponseEl, error.message, "Claude");
                setLoadingState(claudeStatusEl, false, "Claude", false, error.message);
            }
        } else {
            claudeStatusEl.textContent = "Claude: Key Missing";
        }

    });

    submitBtnGemini.addEventListener('click', async () => {
        const promptText = userPromptInput.value.trim();
        
        if (!promptText) {
            alert("Please enter a prompt.");
            return;
        }
        if (!geminiKey) {
            alert("Please ensure Gemini API key is set in script.js.");
            return;
        }

        submitBtnGemini.disabled = true;
        userPromptInput.disabled = true;

        // Append current user prompt to UI for each active model
        if (geminiKey) appendUserPromptToUI(geminiResponseEl, promptText);
        
        userPromptInput.value = ''; 

        // --- Gemini Call ---
        if (geminiKey) {
            setLoadingState(geminiStatusEl, true, "Gemini");
            
            geminiChatHistory.push({ role: "user", parts: [{ text: promptText }] });

            try {
                const response = await callGemini(geminiChatHistory, geminiKey); 
                
                appendAIResponseToUI(geminiResponseEl, response, "Gemini");
                setLoadingState(geminiStatusEl, false, "Gemini", true);
            } catch (error) {
                console.error("Gemini Error:", error);
                appendErrorToUI(geminiResponseEl, error.message, "Gemini");
                setLoadingState(geminiStatusEl, false, "Gemini", false, error.message);
                
                if (geminiChatHistory.length > 0 && geminiChatHistory[geminiChatHistory.length - 1].role === 'user') {
                    geminiChatHistory.pop();
                }
            }
        } else {
            geminiStatusEl.textContent = "Gemini: Key Missing";
            
        }

    });

    submitBtn.addEventListener('click', async () => {
        const promptText = userPromptInput.value.trim();
        
        if (!promptText) {
            alert("Please enter a prompt.");
            return;
        }
        if (!openAIKey && !claudeKey && !geminiKey) {
            alert("Please ensure at least one API key is set in script.js.");
            return;
        }

        submitBtn.disabled = true;
        userPromptInput.disabled = true;

        // Append current user prompt to UI for each active model
        if (openAIKey) appendUserPromptToUI(openaiResponseEl, promptText);
        if (claudeKey) appendUserPromptToUI(claudeResponseEl, promptText);
        if (geminiKey) appendUserPromptToUI(geminiResponseEl, promptText);
        
        userPromptInput.value = ''; 

        // --- OpenAI Call ---
        if (openAIKey) {
            setLoadingState(openaiStatusEl, true, "ChatGPT (OpenAI)");
            openaiMessages.push({ "role": "user", "content": promptText });
            try {
                const response = await callOpenAI(openaiMessages, openAIKey);
                openaiMessages.push({ "role": "assistant", "content": response });
                appendAIResponseToUI(openaiResponseEl, response, "ChatGPT (OpenAI)");
                setLoadingState(openaiStatusEl, false, "ChatGPT (OpenAI)", true);
            } catch (error) {
                console.error("OpenAI Error:", error);
                appendErrorToUI(openaiResponseEl, error.message, "ChatGPT (OpenAI)");
                setLoadingState(openaiStatusEl, false, "ChatGPT (OpenAI)", false, error.message);
                openaiMessages.pop(); 
            }
        } else {
            openaiStatusEl.textContent = "OpenAI: Key Missing";
            
        }

        // --- Claude Call ---
        if (claudeKey) {
            setLoadingState(claudeStatusEl, true, "Claude");
            const currentClaudeApiMessages = [...claudeMessages, { "role": "user", "content": promptText }];
            try {
                const response = await callClaude(currentClaudeApiMessages, claudeKey);
                claudeMessages.push({ "role": "user", "content": promptText });
                claudeMessages.push({ "role": "assistant", "content": response });
                appendAIResponseToUI(claudeResponseEl, response, "Claude");
                setLoadingState(claudeStatusEl, false, "Claude", true);
            } catch (error) {
                console.error("Claude Error:", error);
                appendErrorToUI(claudeResponseEl, error.message, "Claude");
                setLoadingState(claudeStatusEl, false, "Claude", false, error.message);
            }
        } else {
            claudeStatusEl.textContent = "Claude: Key Missing";
        }

        // --- Gemini Call ---
        if (geminiKey) {
            setLoadingState(geminiStatusEl, true, "Gemini");
            
            geminiChatHistory.push({ role: "user", parts: [{ text: promptText }] });

            try {
                const response = await callGemini(geminiChatHistory, geminiKey); 
                
                appendAIResponseToUI(geminiResponseEl, response, "Gemini");
                setLoadingState(geminiStatusEl, false, "Gemini", true);
            } catch (error) {
                console.error("Gemini Error:", error);
                appendErrorToUI(geminiResponseEl, error.message, "Gemini");
                setLoadingState(geminiStatusEl, false, "Gemini", false, error.message);
                
                if (geminiChatHistory.length > 0 && geminiChatHistory[geminiChatHistory.length - 1].role === 'user') {
                    geminiChatHistory.pop();
                }
            }
        } else {
            geminiStatusEl.textContent = "Gemini: Key Missing";
            
        }

    });

    function setLoadingState(statusEl, isLoading, modelName, success = null, errorMessage = null) {
        statusEl.classList.toggle('pulsing', isLoading);
        if (isLoading) {
            statusEl.textContent = `${modelName}: Processing...`;
        } else {
            if (success === true) {
                statusEl.textContent = `${modelName}: Success!`;
            } else if (success === false) {
                statusEl.textContent = `${modelName}: Error.`;
            }
        }
    }

    

    // Initial UI setup
    openaiStatusEl.textContent = "OpenAI: Ready";
    claudeStatusEl.textContent = "Claude: Ready";
    geminiStatusEl.textContent = "Gemini: Ready";
});