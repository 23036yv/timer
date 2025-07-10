// ===============================================
// 1. StorageManager �N���X (�ύX�Ȃ�)
// ===============================================
class StorageManager {
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`�f�[�^��LocalStorage�ւ̕ۑ����ɃG���[���������܂��� (�L�[: ${key}):`, e);
        }
    }

    static load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`�f�[�^��LocalStorage����̓ǂݍ��ݒ��ɃG���[���������܂��� (�L�[: ${key}):`, e);
            return null;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`LocalStorage����̃f�[�^�폜���ɃG���[���������܂��� (�L�[: ${key}):`, e);
        }
    }
}

// ===============================================
// 2. Timer �N���X
// ===============================================
class Timer {
    constructor(focusTimeMinutes = 25, breakTimeMinutes = 5) {
        this.initialFocusTime = focusTimeMinutes * 60; // �b�ɕϊ�
        this.initialBreakTime = breakTimeMinutes * 60; // �b�ɕϊ�
        this.focusTime = this.initialFocusTime;
        this.breakTime = this.initialBreakTime;
        this.isFocusing = true; // ���ݏW���Z�b�V���������x�e�Z�b�V��������
        this.remainingTime = this.focusTime; // ���݂̃Z�b�V�����̎c�莞��
        this.currentSessionTotalTime = this.focusTime; // ���݂̃Z�b�V�����̍��v���ԁi�i���o�[�p�j
        this.intervalId = null;
        this.isPaused = true;
        this.totalFocusDuration = null;
        this.elapsedFocusTime = 0;

        // �V�[�P���X�֘A�̃v���p�e�B
        this.sessionSequence = null; // ��: [{ type: 'focus', duration: 25 }, { type: 'break', duration: 5 }]
        this.currentSessionIndex = 0;

        this.onTick = () => { }; // 1�b���ƂɌĂ΂��R�[���o�b�N
        this.onComplete = () => { }; // �X�̃Z�b�V�����������ɌĂ΂��R�[���o�b�N (�W��/�x�e)
        this.onSequenceComplete = () => { }; // �V�[�P���X�S�̊������ɌĂ΂��R�[���o�b�N
    }

    // �ʏ�̒P��T�C�N���ݒ�
    // **�������C��:** startImmediately �����Ƃ��̊֘A���W�b�N���폜
    setTimes(focusMinutes, breakMinutes) {
        this.initialFocusTime = focusMinutes * 60;
        this.initialBreakTime = breakMinutes * 60;
        this.sessionSequence = null; // �V�[�P���X���[�h������
        this.currentSessionIndex = 0;

        // **�������C��:** �^�C�}�[����~���̏ꍇ�̂ݎc�莞�Ԃƍ��v���Ԃ��X�V
        // ����ɂ��A�ꎞ��~���ɐݒ肪�ύX����Ă��A�^�C�}�[�������Ă���Ԃɗ\�����ʃ��Z�b�g��h���܂��B
        if (this.isPaused) {
            this.focusTime = this.initialFocusTime;
            this.breakTime = this.initialBreakTime;
            this.remainingTime = this.isFocusing ? this.focusTime : this.breakTime;
            this.currentSessionTotalTime = this.remainingTime;
        }
    }

    // �V�[�P���X�ݒ�
    // **�������C��:** setSessionSequence���A�V�[�P���X��ݒ肵����ꎞ��~��Ԃɂ���̂��]�܂���
    setSessionSequence(sequence) {
        this.sessionSequence = sequence.map(s => ({ ...s, duration: s.duration * 60 })); // �b�ɕϊ�
        this.currentSessionIndex = 0;
        this.isFocusing = (this.sessionSequence[0].type === 'focus');
        this.remainingTime = this.sessionSequence[0].duration;
        this.currentSessionTotalTime = this.remainingTime;
        this.pause(); // �V�[�P���X�ݒ莞�͏�Ɉ�U��~
    }

    setPomodoro() {
        this.setTimes(25, 5);
        this.isFocusing = true;
        this.remainingTime = this.focusTime;
        this.currentSessionTotalTime = this.focusTime;
    }

    start() {
        if (this.intervalId !== null) return;

        this.isPaused = false;
        this.intervalId = setInterval(() => {
            this.remainingTime--;
            if (this.isFocusing && this.totalFocusDuration !== null) {
                this.elapsedFocusTime++;
            }
            this.onTick(this.remainingTime);

            if (this.remainingTime <= 0) {
                this.pause();
                const sessionWasFocusing = this.isFocusing;

                this.onComplete(sessionWasFocusing);

                if (this.sessionSequence) {
                    this.currentSessionIndex++;
                    if (this.currentSessionIndex < this.sessionSequence.length) {
                        const nextSession = this.sessionSequence[this.currentSessionIndex];
                        this.isFocusing = (nextSession.type === 'focus');
                        this.remainingTime = nextSession.duration;
                        this.currentSessionTotalTime = this.remainingTime;
                        this.start();
                    } else {
                        this.onSequenceComplete();
                        this.sessionSequence = null;
                        this.currentSessionIndex = 0;
                    }
                } else {
                    this.isFocusing = !this.isFocusing;
                    this.remainingTime = this.isFocusing ? this.focusTime : this.breakTime;
                    this.currentSessionTotalTime = this.remainingTime;
                }
            }
        }, 1000);
    }

    pause() {
        if (this.intervalId === null) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isPaused = true;
    }

    reset() {
        this.pause();
        this.elapsedFocusTime = 0;
        this.totalFocusDuration = null;

        if (this.sessionSequence) {
            this.currentSessionIndex = 0;
            const firstSession = this.sessionSequence[0];
            this.isFocusing = (firstSession.type === 'focus');
            this.remainingTime = firstSession.duration;
            this.currentSessionTotalTime = this.remainingTime;
        } else {
            this.isFocusing = true;
            this.focusTime = this.initialFocusTime;
            this.breakTime = this.initialBreakTime;
            this.remainingTime = this.focusTime;
            this.currentSessionTotalTime = this.focusTime;
        }
        this.onTick(this.remainingTime);
    }

    getRemainingTime() {
        return this.remainingTime;
    }

    getIsPaused() {
        return this.isPaused;
    }

    getIsFocusing() {
        return this.isFocusing;
    }

    getCurrentSessionTotalTime() {
        return this.currentSessionTotalTime;
    }
}

// ===============================================
// 3. UserInterface �N���X (�ύX�Ȃ�)
// ===============================================
class UserInterface {
    constructor() {
        this.timerDisplay = document.getElementById('timer-display');
        this.startButton = document.getElementById('start-button');
        this.stopButton = document.getElementById('stop-button');
        this.resetButton = document.getElementById('reset-button');
        this.focusTimeInput = document.getElementById('focus-time');
        this.enableBreakCheckbox = document.getElementById('enable-break');
        this.pomodoroPresetButton = document.getElementById('pomodoro-preset');
        this.longTermGoalInput = document.getElementById('long-term-goal');
        this.saveTasksButton = document.getElementById('save-tasks-button');
        this.progressBar = document.getElementById('progress-bar');
        this.taskListContainer = document.getElementById('task-list');
        this.newTaskInput = document.getElementById('new-task-input');
        this.addTaskButton = document.getElementById('add-task-button');

        this.calendarHeader = document.getElementById('current-month-year');
        this.prevMonthButton = document.getElementById('prev-month');
        this.nextMonthButton = document.getElementById('next-month');
        this.calendarGrid = document.querySelector('.calendar-grid');
    }

    updateTimerDisplay(seconds, isFocusing) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        this.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        this.timerDisplay.className = `timer-display ${isFocusing ? 'focusing' : 'break-time'}`;
        document.body.className = isFocusing ? 'focusing' : 'break-time';
    }

    updateProgressBar(progress) {
        this.progressBar.style.width = `${progress * 100}%`;
    }

    getFocusTimeInput() {
        return parseInt(this.focusTimeInput.value);
    }

    setFocusTimeInput(minutes) {
        this.focusTimeInput.value = minutes;
    }

    isBreakEnabled() {
        return this.enableBreakCheckbox.checked;
    }

    setBreakEnabled(enabled) {
        this.enableBreakCheckbox.checked = enabled;
    }

    setBreakCheckboxDisabled(disabled) {
        this.enableBreakCheckbox.disabled = disabled;
    }

    getLongTermGoal() {
        return this.longTermGoalInput.value;
    }

    setLongTermGoal(goal) {
        this.longTermGoalInput.value = goal;
    }

    disableStartButton() {
        this.startButton.disabled = true;
    }

    enableStartButton() {
        this.startButton.disabled = false;
    }

    disableStopButton() {
        this.stopButton.disabled = true;
    }

    enableStopButton() {
        this.stopButton.disabled = false;
    }

    disableTimeInputs() {
        this.focusTimeInput.disabled = true;
        this.enableBreakCheckbox.disabled = true;
        this.pomodoroPresetButton.disabled = true;
    }

    enableTimeInputs() {
        this.focusTimeInput.disabled = false;
        this.pomodoroPresetButton.disabled = false;
        // enableBreakCheckbox �� disabled ��Ԃ� updateTimerSettings �Ő��䂳��邽�߁A�����ł͕ύX���Ȃ�
    }

    renderTaskList(tasks, onDelete, onToggle) {
        this.taskListContainer.innerHTML = '';
        if (tasks.length === 0) {
            this.taskListContainer.innerHTML = '<p style="text-align: center; color: #888;">�^�X�N������܂���B</p>';
            return;
        }
        tasks.forEach((task, index) => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => onToggle(index));

            const taskText = document.createElement('span');
            taskText.textContent = task.text;
            if (task.completed) {
                taskText.classList.add('completed');
            }

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '�폜';
            deleteButton.addEventListener('click', () => onDelete(index));

            taskItem.appendChild(checkbox);
            taskItem.appendChild(taskText);
            taskItem.appendChild(deleteButton);
            this.taskListContainer.appendChild(taskItem);
        });
    }

    getNewTaskInput() {
        return this.newTaskInput.value.trim();
    }

    clearNewTaskInput() {
        this.newTaskInput.value = '';
    }

    renderCalendar(year, month, focusRecords) {
        this.calendarHeader.textContent = `${year}�N ${month + 1}��`;
        while (this.calendarGrid.children.length > 7) {
            this.calendarGrid.removeChild(this.calendarGrid.lastChild);
        }

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const numDays = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'empty');
            this.calendarGrid.appendChild(emptyCell);
        }

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        for (let i = 1; i <= numDays; i++) {
            const date = new Date(year, month, i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day');

            if (dateStr === todayStr) {
                dayCell.classList.add('current-day');
            }

            const dateNumber = document.createElement('span');
            dateNumber.classList.add('date-number');
            dateNumber.textContent = i;
            dayCell.appendChild(dateNumber);

            const record = focusRecords[dateStr];
            if (record && record.totalMinutes > 0) {
                const focusMinutesSpan = document.createElement('span');
                focusMinutesSpan.classList.add('focus-minutes');
                focusMinutesSpan.textContent = `${record.totalMinutes}��`;
                dayCell.appendChild(focusMinutesSpan);
            }

            this.calendarGrid.appendChild(dayCell);
        }
    }
}

// ===============================================
// 4. FocusRecordManager �N���X (�ύX�Ȃ�)
// ===============================================
class FocusRecordManager {
    constructor() {
        this.records = {};
        this.loadRecords();
    }

    addFocusMinutes(minutes) {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        if (!this.records[dateStr]) {
            this.records[dateStr] = { totalMinutes: 0 };
        }
        this.records[dateStr].totalMinutes += minutes;
        this.saveRecords();
    }

    getRecordsForMonth(year, month) {
        const monthRecords = {};
        for (const dateStr in this.records) {
            const [recordYear, recordMonth] = dateStr.split('-').map(Number);
            if (recordYear === year && recordMonth === (month + 1)) {
                monthRecords[dateStr] = this.records[dateStr];
            }
        }
        return monthRecords;
    }

    saveRecords() {
        StorageManager.save('focusRecords', this.records);
    }

    loadRecords() {
        const loadedRecords = StorageManager.load('focusRecords');
        if (loadedRecords) {
            this.records = loadedRecords;
        }
    }
}

// ===============================================
// 5. TaskGoalManager �N���X (�ύX�Ȃ�)
// ===============================================
class TaskGoalManager {
    constructor() {
        this.longTermGoal = '';
        this.tasks = [];
        this.loadTasksAndGoal();
    }

    saveTasksAndGoal() {
        StorageManager.save('longTermGoal', this.longTermGoal);
        StorageManager.save('tasks', this.tasks);
    }

    loadTasksAndGoal() {
        const loadedGoal = StorageManager.load('longTermGoal');
        if (typeof loadedGoal === 'string') {
            this.longTermGoal = loadedGoal;
        }
        const loadedTasks = StorageManager.load('tasks');
        if (Array.isArray(loadedTasks)) {
            this.tasks = loadedTasks;
        }
    }

    setLongTermGoal(goal) {
        this.longTermGoal = goal;
    }

    getLongTermGoal() {
        return this.longTermGoal;
    }

    addTask(text) {
        if (text) {
            this.tasks.push({ text: text, completed: false });
            this.saveTasksAndGoal();
        }
    }

    deleteTask(index) {
        if (index >= 0 && index < this.tasks.length) {
            this.tasks.splice(index, 1);
            this.saveTasksAndGoal();
        }
    }

    toggleTaskCompletion(index) {
        if (index >= 0 && index < this.tasks.length) {
            this.tasks[index].completed = !this.tasks[index].completed;
            this.saveTasksAndGoal();
        }
    }

    getTasks() {
        return this.tasks;
    }
}

// ===============================================
// 6. App �N���X (���C�����W�b�N - ���I�V�[�P���X�����̐���)
// ===============================================
class App {
    constructor() {
        this.ui = new UserInterface();
        this.timer = new Timer(this.ui.getFocusTimeInput(), 5);
        this.taskGoalManager = new TaskGoalManager();
        this.focusRecordManager = new FocusRecordManager();

        this.currentCalendarDate = new Date();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        // �A�v�����������ɁA���݂�UI�ݒ��Timer�ɔ��f�����A�^�C�}�[�����Z�b�g����
        this.updateTimerSettings(true);
        this.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
        this.renderTasks();
        this.ui.updateProgressBar(1);
        this.renderCalendar();
    }

    setupEventListeners() {
        this.ui.startButton.addEventListener('click', () => this.startSession());
        this.ui.stopButton.addEventListener('click', () => this.stopSession());
        this.ui.resetButton.addEventListener('click', () => this.resetSession());

        // **�������C��:**
        // �W�����ԓ��͂Ƌx�e�`�F�b�N�{�b�N�X�̕ύX�C�x���g
        // �����̕ύX�́A�^�C�}�[���ꎞ��~���̏ꍇ�ɂ̂ݐV�����ݒ���^�C�}�[�ɔ��f���A���Z�b�g���܂��B
        // �^�C�}�[�����쒆�͂����̓��͖͂���������邽�߁A���̃C�x���g�͔��΂��܂���B
        this.ui.focusTimeInput.addEventListener('change', () => this.handleTimerSettingsChange());
        this.ui.enableBreakCheckbox.addEventListener('change', () => this.handleTimerSettingsChange());
        this.ui.pomodoroPresetButton.addEventListener('click', () => this.setPomodoroPreset());

        this.timer.onTick = (remainingTime) => {
            this.updateTimerDisplay(remainingTime, this.timer.getIsFocusing());
            const total = this.timer.getCurrentSessionTotalTime();
            // 0���Z��h��
            this.ui.updateProgressBar(total > 0 ? remainingTime / total : 0);
        };

        this.timer.onComplete = (sessionWasFocusing) => {
            if (sessionWasFocusing === true) {
                // �V�[�P���X�̏ꍇ�A�e�W�����Ԃ̋L�^�ł͂Ȃ��A�ݒ肳�ꂽ�W�����Ԃ��L�^���܂�
                const focusMinutes = this.ui.getFocusTimeInput();
                this.focusRecordManager.addFocusMinutes(focusMinutes);
                this.renderCalendar();
                alert('�W���Z�b�V�������������܂����I');
            } else if (sessionWasFocusing === false) {
                alert('�x�e�Z�b�V�������������܂����I');
            }
        };

        this.timer.onSequenceComplete = () => {
            alert('���ׂẴZ�b�V�������������܂����I');
            this.resetSession();
        };

        this.ui.saveTasksButton.addEventListener('click', () => this.saveTasksAndGoals());
        this.ui.addTaskButton.addEventListener('click', () => this.addTask());
        this.ui.newTaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        this.ui.prevMonthButton.addEventListener('click', () => this.changeMonth(-1));
        this.ui.nextMonthButton.addEventListener('click', () => this.changeMonth(1));
    }

    loadInitialData() {
        this.taskGoalManager.loadTasksAndGoal();
        this.ui.setLongTermGoal(this.taskGoalManager.getLongTermGoal());
        this.focusRecordManager.loadRecords();
    }

    // **�������C��:** �^�C�}�[�ݒ肪�ύX���ꂽ�Ƃ��̋��ʃn���h��
    handleTimerSettingsChange() {
        if (this.timer.getIsPaused()) { // �^�C�}�[���ꎞ��~���܂��͏�����Ԃ̏ꍇ�̂�
            this.updateTimerSettings(true); // �^�C�}�[�����Z�b�g����UI�ݒ��K�p
            this.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
            this.ui.updateProgressBar(1);
        }
    }

    // **�������C��:**
    startSession() {
        if (!this.timer.getIsPaused()) {
            return; // ���łɓ��쒆�Ȃ牽�����Ȃ�
        }

        // �^�C�}�[���ꎞ��~���̏ꍇ�ł��AUI�̐ݒ�l���ύX����Ă��Ȃ������m�F
        // �ύX����Ă��Ȃ���΁A���̂܂܍ĊJ
        // �ύX����Ă���΁AresetSession�o�R�Ō��݂�UI�ݒ�𔽉f������
        const currentFocusTimeInSeconds = this.ui.getFocusTimeInput() * 60;
        const currentIsBreakEnabled = this.ui.isBreakEnabled();

        const isTimerSettingsChanged =
            (this.timer.sessionSequence === null && this.timer.initialFocusTime !== currentFocusTimeInSeconds) || // �ʏ탂�[�h�Ŏ��Ԃ��ς����
            (this.timer.sessionSequence !== null && !currentIsBreakEnabled) || // �V�[�P���X���[�h����x�e�Ȃ��ɕύX���ꂽ
            (this.timer.sessionSequence === null && currentIsBreakEnabled && currentFocusTimeInSeconds > 25 * 60); // �ʏ탂�[�h����V�[�P���X���[�h�ɐ؂�ւ���������������

        if (this.timer.getRemainingTime() <= 0 || isTimerSettingsChanged) {
            // ���Ԃ�0�ɂȂ��Ă��邩�A�܂��͐ݒ肪�ύX����Ă���ꍇ�̓��Z�b�g���ĊJ�n
            this.resetSession();
        }

        this.ui.disableStartButton();
        this.ui.enableStopButton();
        this.ui.disableTimeInputs(); // �^�C�}�[���쒆�͐ݒ�ύX��s�ɂ���
        this.timer.start();
    }

    // **�������C��:**
    stopSession() {
        if (this.timer.getIsPaused()) {
            return; // ���łɒ�~���Ȃ牽�����Ȃ�
        }
        this.timer.pause();
        this.ui.enableStartButton();
        this.ui.enableStopButton(); // ��~��͊J�n�ł���悤�A�{�^���͗L���̂܂�
        this.ui.enableTimeInputs(); // �ݒ�ύX���Ăщ\�ɂ���
    }

    // **�������C��:**
    resetSession() {
        this.timer.reset(); // Timer�N���X��reset���\�b�h��������Ԃ�������
        this.updateTimerSettings(true); // UI�̐ݒ�l�ɍ��킹��Timer�����Z�b�g�i�d�v�j
        this.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
        this.ui.updateProgressBar(1);
        this.ui.enableStartButton();
        this.ui.disableStopButton(); // ���Z�b�g���stop�͖���
        this.ui.enableTimeInputs();
    }

    /**
     * �^�C�}�[�̐ݒ���X�V���A�K�v�ł���΃^�C�}�[�����Z�b�g���܂��B
     * @param {boolean} shouldResetTimer - true�̏ꍇ�A�^�C�}�[�����݂�UI�ݒ�Ń��Z�b�g���܂��B
     */
    updateTimerSettings(shouldResetTimer = false) {
        let focusMinutes = this.ui.getFocusTimeInput();
        let isBreakEnabled = this.ui.isBreakEnabled();

        const baseFocusTime = 25;
        const baseBreakTime = 5;

        // ���[��1: �W�����Ԃ�25���ȉ��̎��A�x�e�͑I���ł��Ȃ� (UI��̋���)
        if (focusMinutes <= baseFocusTime) {
            this.ui.setBreakCheckboxDisabled(true);
            this.ui.setBreakEnabled(false);
            if (shouldResetTimer) {
                this.timer.setTimes(focusMinutes, 0); // �x�e�Ȃ�(0��)��ݒ�
            }
        }
        // ���[��2: �W�����Ԃ�25����蒷���A���x�e�����I�����Ă���ꍇ�A���I�ȃV�[�P���X��ݒ�
        else if (focusMinutes > baseFocusTime && isBreakEnabled) {
            const sequence = [];
            let remainingFocusTime = focusMinutes;

            while (remainingFocusTime >= baseFocusTime) {
                sequence.push({ type: 'focus', duration: baseFocusTime });
                remainingFocusTime -= baseFocusTime;
                if (remainingFocusTime > 0) { // �Ō�̏W���Z�b�V�����̌�ɋx�e�͓���Ȃ�
                    sequence.push({ type: 'break', duration: baseBreakTime });
                }
            }
            if (remainingFocusTime > 0) { // �c��̏W�����Ԃ�����ꍇ
                sequence.push({ type: 'focus', duration: remainingFocusTime });
            }

            if (shouldResetTimer) {
                this.timer.setSessionSequence(sequence);
            }
            this.ui.setBreakCheckboxDisabled(false);
            this.ui.setBreakEnabled(true);
        }
        // ���[��3: �W�����Ԃ�25����蒷���A���x�e�Ȃ���I�����Ă���ꍇ
        else if (focusMinutes > baseFocusTime && !isBreakEnabled) {
            this.ui.setBreakCheckboxDisabled(false);
            this.ui.setBreakEnabled(false);
            if (shouldResetTimer) {
                this.timer.setTimes(focusMinutes, 0); // �W�����Ԃ݂̂�ݒ�
            }
        }
        // updateTimerDisplay �� updateProgressBar �͌Ăяo�����Ő���
    }

    setPomodoroPreset() {
        this.ui.setFocusTimeInput(25);
        this.ui.setBreakEnabled(true); // �x�e���������
        this.handleTimerSettingsChange(); // �v���Z�b�g�ݒ��A�^�C�}�[�ݒ���X�V
    }

    saveTasksAndGoals() {
        this.taskGoalManager.setLongTermGoal(this.ui.getLongTermGoal());
        this.taskGoalManager.saveTasksAndGoal();
        alert('�^�X�N�ƖڕW��ۑ����܂����I');
    }

    updateTimerDisplay(seconds, isFocusing) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        this.ui.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        this.ui.timerDisplay.className = `timer-display ${isFocusing ? 'focusing' : 'break-time'}`;
        document.body.className = isFocusing ? 'focusing' : 'break-time';
    }

    updateProgressBar(progress) {
        this.ui.progressBar.style.width = `${progress * 100}%`;
    }

    addTask() {
        const newTaskText = this.ui.getNewTaskInput();
        if (newTaskText) {
            this.taskGoalManager.addTask(newTaskText);
            this.ui.clearNewTaskInput();
            this.renderTasks();
        }
    }

    deleteTask(index) {
        this.taskGoalManager.deleteTask(index);
        this.renderTasks();
    }

    toggleTaskCompletion(index) {
        this.taskGoalManager.toggleTaskCompletion(index);
        this.renderTasks();
    }

    renderTasks() {
        this.ui.renderTaskList(this.taskGoalManager.getTasks(),
            this.deleteTask.bind(this),
            this.toggleTaskCompletion.bind(this));
    }

    renderCalendar() {
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();

        const records = this.focusRecordManager.getRecordsForMonth(year, month);
        this.ui.renderCalendar(year, month, records);
    }

    changeMonth(delta) {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + delta);
        this.renderCalendar();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});