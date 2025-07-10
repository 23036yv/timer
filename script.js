// ===============================================
// 1. StorageManager クラス (変更なし)
// ===============================================
class StorageManager {
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`データのLocalStorageへの保存中にエラーが発生しました (キー: ${key}):`, e);
        }
    }

    static load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`データのLocalStorageからの読み込み中にエラーが発生しました (キー: ${key}):`, e);
            return null;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`LocalStorageからのデータ削除中にエラーが発生しました (キー: ${key}):`, e);
        }
    }
}

// ===============================================
// 2. Timer クラス (変更なし - シーケンス機能は既に実装済み)
// ===============================================
class Timer {
    constructor(focusTimeMinutes = 25, breakTimeMinutes = 5) {
        this.initialFocusTime = focusTimeMinutes * 60; // 秒に変換
        this.initialBreakTime = breakTimeMinutes * 60; // 秒に変換
        this.focusTime = this.initialFocusTime;
        this.breakTime = this.initialBreakTime;
        this.isFocusing = true; // 現在集中セッション中か休憩セッション中か
        this.remainingTime = this.focusTime; // 現在のセッションの残り時間
        this.currentSessionTotalTime = this.focusTime; // 現在のセッションの合計時間（進捗バー用）
        this.intervalId = null;
        this.isPaused = true;
        this.totalFocusDuration = null;
        this.elapsedFocusTime = 0;

        // シーケンス関連のプロパティ
        this.sessionSequence = null; // 例: [{ type: 'focus', duration: 25 }, { type: 'break', duration: 5 }]
        this.currentSessionIndex = 0;

        this.onTick = () => { }; // 1秒ごとに呼ばれるコールバック
        this.onComplete = () => { }; // 個々のセッション完了時に呼ばれるコールバック (集中/休憩)
        this.onSequenceComplete = () => { }; // シーケンス全体完了時に呼ばれるコールバック
    }

    // 通常の単一サイクル設定
    setTimes(focusMinutes, breakMinutes, startImmediately = false) {
        this.initialFocusTime = focusMinutes * 60;
        this.initialBreakTime = breakMinutes * 60;
        this.sessionSequence = null; // シーケンスモードを解除
        this.currentSessionIndex = 0;

        if (this.isPaused || startImmediately) {
            this.focusTime = this.initialFocusTime;
            this.breakTime = this.initialBreakTime;
            this.remainingTime = this.isFocusing ? this.focusTime : this.breakTime;
            this.currentSessionTotalTime = this.remainingTime;
        }

        if (startImmediately && !this.isPaused) {
            this.pause();
            this.start();
        }
    }

    // シーケンス設定
    setSessionSequence(sequence) {
        this.sessionSequence = sequence.map(s => ({ ...s, duration: s.duration * 60 })); // 秒に変換
        this.currentSessionIndex = 0;
        this.isFocusing = (this.sessionSequence[0].type === 'focus');
        this.remainingTime = this.sessionSequence[0].duration;
        this.currentSessionTotalTime = this.remainingTime;
        this.pause(); // シーケンス設定時は一旦停止
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
                const sessionWasFocusing = this.isFocusing; // 完了したセッションが集中だったか休憩だったか

                this.onComplete(sessionWasFocusing); // 個々のセッション完了コールバック

                if (this.sessionSequence) {
                    // シーケンスモードの場合
                    this.currentSessionIndex++;
                    if (this.currentSessionIndex < this.sessionSequence.length) {
                        const nextSession = this.sessionSequence[this.currentSessionIndex];
                        this.isFocusing = (nextSession.type === 'focus');
                        this.remainingTime = nextSession.duration;
                        this.currentSessionTotalTime = this.remainingTime;
                        this.start(); // 次のセッションをすぐに開始
                    } else {
                        // シーケンス完了
                        this.onSequenceComplete();
                        this.sessionSequence = null; // シーケンスをクリア
                        this.currentSessionIndex = 0;
                    }
                } else {
                    // 通常の単一サイクルモードの場合
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
            // シーケンスモードの場合、シーケンスの最初に戻る
            this.currentSessionIndex = 0;
            const firstSession = this.sessionSequence[0];
            this.isFocusing = (firstSession.type === 'focus');
            this.remainingTime = firstSession.duration;
            this.currentSessionTotalTime = this.remainingTime;
        } else {
            // 通常モードの場合、初期設定に戻る
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
// 3. UserInterface クラス (変更なし)
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
        // enableBreakCheckbox の disabled 状態は updateTimerSettings で制御されるため、ここでは変更しない
    }

    renderTaskList(tasks, onDelete, onToggle) {
        this.taskListContainer.innerHTML = '';
        if (tasks.length === 0) {
            this.taskListContainer.innerHTML = '<p style="text-align: center; color: #888;">タスクがありません。</p>';
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
            deleteButton.textContent = '削除';
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
        this.calendarHeader.textContent = `${year}年 ${month + 1}月`;
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
                focusMinutesSpan.textContent = `${record.totalMinutes}分`;
                dayCell.appendChild(focusMinutesSpan);
            }

            this.calendarGrid.appendChild(dayCell);
        }
    }
}

// ===============================================
// 4. FocusRecordManager クラス (変更なし)
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
// 5. TaskGoalManager クラス (変更なし)
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
// 6. App クラス (メインロジック - 動的シーケンス生成の制御)
// ===============================================
class App {
    constructor() {
        this.ui = new UserInterface();
        this.timer = new Timer(this.ui.getFocusTimeInput(), 5); // 休憩時間の初期値を5分に固定
        this.taskGoalManager = new TaskGoalManager();
        this.focusRecordManager = new FocusRecordManager();

        this.currentCalendarDate = new Date();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.updateTimerSettings(false); // 初期化時にもタイマー設定を適用してUIを調整
        this.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
        this.renderTasks();
        this.ui.updateProgressBar(1);
        this.renderCalendar();
    }

    setupEventListeners() {
        this.ui.startButton.addEventListener('click', () => this.startSession());
        this.ui.stopButton.addEventListener('click', () => this.stopSession());
        this.ui.resetButton.addEventListener('click', () => this.resetSession());
        this.ui.focusTimeInput.addEventListener('change', () => this.updateTimerSettings());
        this.ui.enableBreakCheckbox.addEventListener('change', () => this.updateTimerSettings());
        this.ui.pomodoroPresetButton.addEventListener('click', () => this.setPomodoroPreset());

        this.timer.onTick = (remainingTime) => {
            this.updateTimerDisplay(remainingTime, this.timer.getIsFocusing());
            const total = this.timer.getCurrentSessionTotalTime();
            this.ui.updateProgressBar(remainingTime / total);
        };

        this.timer.onComplete = (sessionWasFocusing) => {
            if (sessionWasFocusing === true) {
                // 集中セッション完了時のみ記録（シーケンスの場合、各集中セッションの時間が記録される）
                // ただし、記録されるのはUIに表示されている集中時間なので、シーケンスの各集中時間の記録は別途考慮が必要
                // ここではシンプルに、UIの入力値（例: 30分や100分）を記録する
                const focusMinutes = this.ui.getFocusTimeInput();
                this.focusRecordManager.addFocusMinutes(focusMinutes);
                this.renderCalendar();

                alert('集中セッションが完了しました！');
            } else if (sessionWasFocusing === false) {
                alert('休憩セッションが完了しました！');
            }
        };

        this.timer.onSequenceComplete = () => {
            alert('すべてのセッションが完了しました！');
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

    startSession() {
        this.updateTimerSettings(false); // タイマーはリセットしないが、UI値は反映させる

        this.ui.disableStartButton();
        this.ui.enableStopButton();
        this.ui.disableTimeInputs();
        this.timer.start();
    }

    stopSession() {
        this.timer.pause();
        this.ui.enableStartButton();
        this.ui.enableStopButton();
        this.ui.enableTimeInputs();
    }

    resetSession() {
        this.timer.reset();
        this.updateTimerSettings(false); // リセット時もタイマー設定を適用し、UIを調整
        this.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
        this.ui.updateProgressBar(1);
        this.ui.enableStartButton();
        this.ui.disableStopButton();
        this.ui.enableTimeInputs();
    }

    updateTimerSettings(resetTimer = true) {
        let focusMinutes = this.ui.getFocusTimeInput();
        let isBreakEnabled = this.ui.isBreakEnabled();

        const baseFocusTime = 25;
        const baseBreakTime = 5;

        // ルール1: 集中時間が25分以下の時、休憩は選択できない (UI上の挙動)
        if (focusMinutes <= baseFocusTime) {
            this.ui.setBreakCheckboxDisabled(true); // チェックボックスを無効化
            this.ui.setBreakEnabled(false); // チェックを外す
            // Timerには休憩なし(0分)を設定
            this.timer.setTimes(focusMinutes, 0, !this.timer.getIsPaused() && resetTimer);
        }
        // ルール2: 集中時間が25分より長く、かつ休憩ありを選択している場合、動的なシーケンスを設定
        else if (focusMinutes > baseFocusTime && isBreakEnabled) {
            const sequence = [];
            let remainingFocusTime = focusMinutes;

            while (remainingFocusTime >= baseFocusTime) {
                sequence.push({ type: 'focus', duration: baseFocusTime });
                remainingFocusTime -= baseFocusTime;
                if (remainingFocusTime > 0) { // 最後の集中セッションの後に休憩は入れない
                    sequence.push({ type: 'break', duration: baseBreakTime });
                }
            }

            // 残りの集中時間がある場合、最後の集中セッションとして追加
            if (remainingFocusTime > 0) {
                sequence.push({ type: 'focus', duration: remainingFocusTime });
            }

            this.timer.setSessionSequence(sequence);
            this.ui.setBreakCheckboxDisabled(false); // チェックボックスは有効のまま
            this.ui.setBreakEnabled(true); // チェックはONのまま
        }
        // ルール3: 集中時間が25分より長く、かつ休憩なしを選択している場合
        else if (focusMinutes > baseFocusTime && !isBreakEnabled) {
            this.ui.setBreakCheckboxDisabled(false); // チェックボックスは有効のまま
            this.ui.setBreakEnabled(false); // チェックはOFFのまま
            // Timerには集中時間のみを設定 (休憩なし)
            this.timer.setTimes(focusMinutes, 0, !this.timer.getIsPaused() && resetTimer);
        }

        // UI表示の更新
        this.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
        this.ui.updateProgressBar(1);
    }

    setPomodoroPreset() {
        this.ui.setFocusTimeInput(25);
        this.ui.setBreakEnabled(true); // 休憩ありを強制
        this.updateTimerSettings(); // プリセット設定後、タイマー設定を更新
    }

    saveTasksAndGoals() {
        this.taskGoalManager.setLongTermGoal(this.ui.getLongTermGoal());
        this.taskGoalManager.saveTasksAndGoal();
        alert('タスクと目標を保存しました！');
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