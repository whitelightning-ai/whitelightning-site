class ModelUploader {
    constructor() {
        this.uploadCustomBtn = document.getElementById('uploadCustomBtn');
        this.uploadModal = document.getElementById('uploadModal');
        this.uploadArea = document.querySelector('.upload-area');
        this.fileInput = document.querySelector('input[type="file"]');
        this.alertBox = document.querySelector('.alert');
        this.modelInfo = document.getElementById('modelDetails');
        this.modelNameInput = document.querySelector('input[name="modelName"]');
        this.modelTypeSelect = document.querySelector('select[name="modelType"]');
        this.uploadButton = document.querySelector('.model-info .button');
        this.loadingSpinner = document.querySelector('.loading');
        this.modelStatus = document.getElementById('modelStatus');
        this.modelTypeSelectMain = document.getElementById('modelTypeSelect');
        this.modelSelect = document.getElementById('modelSelect');

        this.currentModelFiles = null;
        this.currentSession = null;
        this.currentVocab = null;
        this.currentScaler = null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.uploadCustomBtn.addEventListener('click', () => {
            this.uploadModal.classList.remove('hidden');
            this.modelTypeSelect.value = this.modelTypeSelectMain.value;
        });

        this.modelTypeSelectMain.addEventListener('change', () => {
            if (!this.uploadModal.classList.contains('hidden')) {
                this.modelTypeSelect.value = this.modelTypeSelectMain.value;
            }
        });

        this.modelTypeSelect.addEventListener('change', () => {
            this.modelTypeSelectMain.value = this.modelTypeSelect.value;
        });

        this.uploadModal.addEventListener('click', (e) => {
            if (e.target === this.uploadModal) {
                this.uploadModal.classList.add('hidden');
                this.resetUploadForm();
            }
        });

        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = '#fff';
            this.uploadArea.style.background = 'var(--card-bg)';
        });
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.style.borderColor = 'var(--main-green)';
            this.uploadArea.style.background = 'var(--section-bg)';
        });
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = 'var(--main-green)';
            this.uploadArea.style.background = 'var(--section-bg)';
            this.handleFiles(e.dataTransfer.files);
        });

        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        this.uploadButton.addEventListener('click', () => this.handleUpload());
    }

    resetUploadForm() {
        this.modelInfo.classList.add('hidden');
        this.alertBox.classList.add('hidden');
        this.modelNameInput.value = '';
        this.fileInput.value = '';
        this.currentModelFiles = null;
    }

    async handleFiles(files) {
        const modelFiles = { onnx: null, vocab: null, scaler: null };

        for (const file of files) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'onnx') modelFiles.onnx = file;
            else if (file.name === 'vocab.json') modelFiles.vocab = file;
            else if (file.name === 'scaler.json') modelFiles.scaler = file;
        }

        if (!modelFiles.onnx || !modelFiles.vocab || !modelFiles.scaler) {
            this.showAlert('Please upload all required files: model.onnx, vocab.json, and scaler.json', 'error');
            return;
        }

        const success = await this.loadModelFiles(modelFiles);
        if (!success) return;

        this.currentModelFiles = modelFiles;
        this.modelInfo.classList.remove('hidden');

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const modelData = JSON.parse(e.target.result);
                if (modelData.model_info) {
                    this.modelNameInput.value = modelData.model_info.name || '';
                    this.modelTypeSelect.value = modelData.model_info.type || this.modelTypeSelectMain.value;
                }
            } catch (error) {
                console.error('Error parsing model info:', error);
            }
        };
        reader.readAsText(modelFiles.vocab);

        this.showAlert('Files uploaded successfully! Please fill in the model information.', 'success');
    }

    async loadModelFiles(modelFiles) {
        try {
            this.currentSession = await ort.InferenceSession.create(URL.createObjectURL(modelFiles.onnx));

            const vocabReader = new FileReader();
            vocabReader.onload = (e) => {
                this.currentVocab = JSON.parse(e.target.result);
            };
            vocabReader.readAsText(modelFiles.vocab);

            const scalerReader = new FileReader();
            scalerReader.onload = (e) => {
                this.currentScaler = JSON.parse(e.target.result);
            };
            scalerReader.readAsText(modelFiles.scaler);

            return true;
        } catch (error) {
            console.error('Error loading model files:', error);
            this.showAlert('Error loading model files. Please try again.', 'error');
            return false;
        }
    }

    addTerminalMessage(text, isError = false) {
        const chatArea = document.querySelector('.terminal-content');
        const messageDiv = document.createElement('p');
        
        // Create full-text and short-text spans
        const fullTextSpan = document.createElement('span');
        fullTextSpan.className = 'full-text';
        fullTextSpan.textContent = text;
        
        const shortTextSpan = document.createElement('span');
        shortTextSpan.className = 'short-text';
        shortTextSpan.textContent = text.length > 30 ? text.substring(0, 27) + '...' : text;
        
        // Add error styling if needed
        if (isError) {
            fullTextSpan.style.color = '#ff6b6b';
            shortTextSpan.style.color = '#ff6b6b';
        }
        
        messageDiv.appendChild(fullTextSpan);
        messageDiv.appendChild(shortTextSpan);
        chatArea.appendChild(messageDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    async handleUpload() {
        if (!this.currentModelFiles) {
            this.showAlert('Please upload model files first', 'error');
            return;
        }

        const modelName = this.modelNameInput.value.trim();
        const modelType = this.modelTypeSelect.value;

        if (!modelName) {
            this.showAlert('Please enter a model name', 'error');
            return;
        }

        this.loadingSpinner.classList.remove('hidden');
        this.uploadButton.disabled = true;

        try {
            const option = document.createElement('option');
            option.value = modelName;
            option.textContent = modelName;
            option.dataset.isCustom = 'true';
            this.modelSelect.appendChild(option);
            this.modelSelect.value = modelName;

            this.modelStatus.textContent = `Model loaded: ${modelName}`;
            this.modelStatus.style.background = '#2db30d';
            this.modelStatus.style.color = '#fff';

            window.currentModel = {
                name: modelName,
                type: modelType,
                files: this.currentModelFiles,
                session: this.currentSession,
                vocab: this.currentVocab,
                scaler: this.currentScaler
            };

            selectedModelType = modelType;
            selectedModel = {
                name: modelName,
                type: modelType,
                prefix: modelName.toLowerCase().replace(/\s+/g, '_'),
                subClasses: []
            };

            this.addTerminalMessage(`Loading model: ${modelName}...`);
            session = this.currentSession;

            artifacts = modelType === 'binary_classifier'
                ? {
                    vocab: this.currentVocab.vocab,
                    idf: this.currentVocab.idf,
                    mean: this.currentScaler.mean || this.currentScaler.scaler_info?.params?.mean,
                    scale: this.currentScaler.scale || this.currentScaler.scaler_info?.params?.scale
                }
                : {
                    tokenizer: this.currentVocab,
                    labelMap: this.currentScaler
                };

            this.addTerminalMessage('Model loaded successfully! You can now start classifying text.');
            this.uploadModal.classList.add('hidden');
            this.resetUploadForm();
            this.showAlert('Model uploaded successfully!', 'success');
        } catch (error) {
            console.error('Error uploading model:', error);
            this.showAlert('Error uploading model. Please try again.', 'error');
        } finally {
            this.loadingSpinner.classList.add('hidden');
            this.uploadButton.disabled = false;
        }
    }

    showAlert(message, type) {
        this.alertBox.textContent = message;
        this.alertBox.className = `alert ${type}`;
        this.alertBox.classList.remove('hidden');
        setTimeout(() => {
            this.alertBox.classList.add('hidden');
        }, 3000);
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    window.modelUploader = new ModelUploader();
});
