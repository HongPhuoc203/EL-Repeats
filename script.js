const textInput = document.getElementById('text-input');
const enVoiceSelect = document.getElementById('en-voice-select');
const viVoiceSelect = document.getElementById('vi-voice-select');
const rateSelect = document.getElementById('rate-select');
const rateValue = document.getElementById('rate-value');
const repeatSelect = document.getElementById('repeat-select');
const repeatValue = document.getElementById('repeat-value');
const delaySelect = document.getElementById('delay-select');
const delayValue = document.getElementById('delay-value');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const statusDiv = document.getElementById('status');
const viHelp = document.getElementById('vi-help');

let synth = window.speechSynthesis;

let currentRepeat = 0;
let isPlaying = false;
let timeoutId = null;

let linesToSpeak = [];
let currentLineIndex = 0;

function populateVoiceList() {
    const allVoices = synth.getVoices();
    if (allVoices.length === 0) return;
    
    // Remember current selections before clearing
    const currentEnVoice = enVoiceSelect.value;
    const currentViVoice = viVoiceSelect.value;
    
    enVoiceSelect.innerHTML = '';
    viVoiceSelect.innerHTML = '';
    
    // Add all voices to both dropdowns so user has complete freedom
    allVoices.forEach((voice) => {
        const option1 = document.createElement('option');
        const option2 = document.createElement('option');
        
        let cleanName = voice.name.replace('Microsoft ', '').replace('Desktop ', '');
        const text = `${cleanName} (${voice.lang})`;
        
        option1.textContent = text;
        option1.value = voice.name;
        
        option2.textContent = text;
        option2.value = voice.name;
        
        enVoiceSelect.appendChild(option1);
        viVoiceSelect.appendChild(option2);
    });
    
    // Re-select or Auto-select English voice
    if (currentEnVoice && allVoices.find(v => v.name === currentEnVoice)) {
        enVoiceSelect.value = currentEnVoice;
    } else {
        const enDefaultIndex = allVoices.findIndex(v => v.lang === 'en-US' && (v.name.includes('Zira') || v.name.includes('Google') || v.name.includes('Samantha')));
        if (enDefaultIndex !== -1) {
            enVoiceSelect.selectedIndex = enDefaultIndex;
        } else {
            const fallback = allVoices.findIndex(v => v.lang.startsWith('en'));
            if (fallback !== -1) enVoiceSelect.selectedIndex = fallback;
        }
    }

    // Check for Vietnamese voices specifically
    const viVoicesList = allVoices.filter(v => v.lang.startsWith('vi'));
    
    if (viVoicesList.length > 0) {
        if (viHelp) viHelp.style.display = 'none';
        
        // Re-select or Auto-select Vietnamese voice
        if (currentViVoice && allVoices.find(v => v.name === currentViVoice)) {
            viVoiceSelect.value = currentViVoice;
        } else {
            const viDefaultIndex = allVoices.findIndex(v => v.lang.startsWith('vi') && (v.name.includes('Google') || v.name.includes('HoaiMy') || v.name.includes('An')));
            if (viDefaultIndex !== -1) {
                viVoiceSelect.selectedIndex = viDefaultIndex;
            } else {
                const fallback = allVoices.findIndex(v => v.lang.startsWith('vi'));
                viVoiceSelect.selectedIndex = fallback;
            }
        }
    } else {
        // No Vietnamese voice found!
        if (viHelp) viHelp.style.display = 'block';
        
        // Let them at least keep their selection or just pick first voice as fallback
        if (currentViVoice && allVoices.find(v => v.name === currentViVoice)) {
            viVoiceSelect.value = currentViVoice;
        } else {
            viVoiceSelect.selectedIndex = 0;
        }
    }
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

// Update displays for range inputs
rateSelect.addEventListener('input', () => rateValue.textContent = rateSelect.value);
repeatSelect.addEventListener('input', () => repeatValue.textContent = repeatSelect.value);
delaySelect.addEventListener('input', () => delayValue.textContent = delaySelect.value + 's');

// Detect Vietnamese characters
function isVietnamese(text) {
    const viRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    return viRegex.test(text);
}

function speak() {
    if (!isPlaying) return;
    
    const allVoices = synth.getVoices();
    
    if (currentLineIndex === 0 && linesToSpeak.length === 0) {
        const text = textInput.value.trim();
        if (text === '') {
            statusDiv.textContent = 'Please enter some text to read!';
            isPlaying = false;
            playBtn.disabled = false;
            playBtn.style.opacity = '1';
            return;
        }
        // Split text by lines
        linesToSpeak = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    }

    if (currentLineIndex >= linesToSpeak.length) {
        currentRepeat++;
        const totalRepeats = parseInt(repeatSelect.value, 10);
        
        if (currentRepeat < totalRepeats && isPlaying) {
            statusDiv.textContent = `Completed repeat ${currentRepeat}. Waiting for next repeat...`;
            currentLineIndex = 0;
            const delayMs = parseFloat(delaySelect.value) * 1000;
            timeoutId = setTimeout(() => {
                speak();
            }, delayMs);
        } else {
            stop();
            statusDiv.textContent = 'Finished reading!';
        }
        return;
    }

    const currentText = linesToSpeak[currentLineIndex];
    const utterThis = new SpeechSynthesisUtterance(currentText);
    
    // Choose voice based on language detection
    const isVi = isVietnamese(currentText);
    const selectedVoiceName = isVi ? viVoiceSelect.value : enVoiceSelect.value;
    
    let matchedVoice = allVoices.find(v => v.name === selectedVoiceName);
    if (!matchedVoice && allVoices.length > 0) matchedVoice = allVoices[0];
    if (matchedVoice) utterThis.voice = matchedVoice;
    
    utterThis.rate = parseFloat(rateSelect.value);
    
    utterThis.onstart = () => {
        const langStr = isVi ? 'Vietnamese' : 'English';
        statusDiv.textContent = `Reading ${langStr}... (Repeat ${currentRepeat + 1}/${repeatSelect.value}) - Line ${currentLineIndex + 1}/${linesToSpeak.length}`;
    };

    utterThis.onend = () => {
        if (isPlaying) {
            currentLineIndex++;
            // Small pause between lines makes it sound more natural
            setTimeout(() => speak(), 250); 
        }
    };

    utterThis.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        if (isPlaying) {
            currentLineIndex++;
            speak();
        }
    };

    synth.speak(utterThis);
}

function stop() {
    isPlaying = false;
    synth.cancel();
    clearTimeout(timeoutId);
    currentRepeat = 0;
    currentLineIndex = 0;
    linesToSpeak = [];
    playBtn.disabled = false;
    playBtn.style.opacity = '1';
    
    if (statusDiv.textContent.includes('Reading') || statusDiv.textContent.includes('Waiting')) {
        statusDiv.textContent = 'Stopped.';
    }
}

playBtn.addEventListener('click', () => {
    if (!isPlaying) {
        isPlaying = true;
        playBtn.disabled = true;
        playBtn.style.opacity = '0.5';
        currentRepeat = 0;
        currentLineIndex = 0;
        linesToSpeak = [];
        speak();
    }
});

stopBtn.addEventListener('click', stop);
