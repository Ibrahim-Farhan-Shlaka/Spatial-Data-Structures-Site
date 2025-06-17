document.addEventListener('DOMContentLoaded', function() {
    const hiddenTextElement = document.getElementById('hidden-text');
    const outputElement = document.getElementById('typewriter-output');
    const fullText = hiddenTextElement.textContent;
    let index = 0;

    function typeWriter() {
        if (index < fullText.length) {
            // Add next character
            const currentText = fullText.substring(0, index + 1);
            outputElement.textContent = currentText;
            
            // Check for container overflow
            if (outputElement.scrollHeight > outputElement.clientHeight) {
                // Find last space before overflow
                let lastSpace = currentText.lastIndexOf(' ');
                if (lastSpace > 0) {
                    // Replace space with line break
                    outputElement.innerHTML = 
                        currentText.substring(0, lastSpace) + '<br>' + 
                        currentText.substring(lastSpace + 1);
                }
            }
            
            index++;
            setTimeout(typeWriter, 8); // Adjust typing speed
        } else {
            outputElement.style.borderRight = 'none';
        }
    }

    // Start the effect
    typeWriter();
});
