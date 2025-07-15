// ===============================================
// 1. StorageManager クラス
// ===============================================
class StorageManager {
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`データをLocalStorageへの保存中にエラーが発生しました (キー: ${key}):`, e);
        }
    }

    static load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`データをLocalStorageからの読み込み中にエラーが発生しました (キー: ${key}):`, e);
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
// 2. Timer クラス
// ===============================================
class Timer {
    constructor(focusTimeMinutes = 25, breakTimeMinutes = 5) {
        this.initialFocusTime = focusTimeMinutes * 60; // 秒に変換
        this.initialBreakTime = breakTimeMinutes * 60; // 秒に変換
        this.focusTime = this.initialFocusTime;
        this.breakTime = this.initialBreakTime;
        this.isFocusing = true; // 現在フォーカスセッション中か休憩セッション中か
        this.remainingTime = this.focusTime; // 現在のセッションの残り時間
        this.currentSessionTotalTime = this.focusTime; // 現在のセッションの合計時間（プログレスバー用）
        this.intervalId = null;
        this.isPaused = true;
        this.totalFocusDuration = null;
        this.elapsedFocusTime = 0;

        // シーケンス関連のプロパティ
        this.sessionSequence = null; // 例: [{ type: 'focus', duration: 25 }, { type: 'break', duration: 5 }]
        this.currentSessionIndex = 0;

        this.onTick = () => { }; // 1秒ごとに呼ばれるコールバック
        this.onComplete = () => { }; // 一つのセッションが終了したときに呼ばれるコールバック (集中/休憩)
        this.onSequenceComplete = () => { }; // シーケンス全体が終了したときに呼ばれるコールバック
    }

    // 通常の単一サイクル設定
    setTimes(focusMinutes, breakMinutes) {
        this.initialFocusTime = focusMinutes * 60;
        this.initialBreakTime = breakMinutes * 60;
        this.sessionSequence = null; // シーケンスモードを解除
        this.currentSessionIndex = 0;

        // タイマーが停止している場合のみ残り時間と合計時間を更新
        if (this.isPaused) {
            this.focusTime = this.initialFocusTime;
            this.breakTime = this.initialBreakTime;
            this.remainingTime = this.isFocusing ? this.focusTime : this.breakTime;
            this.currentSessionTotalTime = this.remainingTime;
        }
    }

    // シーケンス設定
    setSessionSequence(sequence) {
        this.sessionSequence = sequence.map(s => ({ ...s, duration: s.duration * 60 })); // 秒に変換
        this.currentSessionIndex = 0;
        this.isFocusing = (this.sessionSequence[0].type === 'focus');
        this.remainingTime = this.sessionSequence[0].duration;
        this.currentSessionTotalTime = this.remainingTime;
        this.pause(); // シーケンス設定後は一旦停止
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
// 3. UserInterface クラス
// ===============================================
class UserInterface {
    constructor() {
        this.timerDisplay = document.getElementById('timer-display');
        this.startButton = document.getElementById('start-button');
        this.stopButton = document.getElementById('stop-button');
        this.resetButton = document.getElementById('reset-button');
        this.focusTimeInput = document.getElementById('focus-time');
        this.enableBreakCheckbox = document.getElementById('enable-break');
        // pomodoroPresetButton の取得は不要になったため削除

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
        // pomodoroPresetButton の disable 設定は不要になったため削除
    }

    enableTimeInputs() {
        this.focusTimeInput.disabled = false;
        // pomodoroPresetButton の enable 設定は不要になったため削除
        // enableBreakCheckbox の disabled は updateTimerSettings で制御されるため、ここでは変更しない
    }

    renderTaskList(tasks, onDelete, onToggle) {
        this.taskListContainer.innerHTML = '';
        if (tasks.length === 0) {
            this.taskListContainer.innerHTML = '<p style="text-align: center; color: #888;">タスクはありません。</p>';
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
// 4. FocusRecordManager クラス
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
// 5. TaskGoalManager クラス
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
// 6. App クラス (メインロジック - シーケンスモード対応)
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
        // アプリ起動時に、現在のUI設定をTimerに反映し、タイマーをリセットする
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

        // 集中時間入力と休憩チェックボックスの変更イベント
        // これらの変更は、タイマーが一時停止している場合にのみ新しい設定をタイマーに反映し、リセットします。
        this.ui.focusTimeInput.addEventListener('change', () => this.handleTimerSettingsChange());
        this.ui.enableBreakCheckbox.addEventListener('change', () => this.handleTimerSettingsChange());

        this.timer.onTick = (remainingTime) => {
            this.updateTimerDisplay(remainingTime, this.timer.getIsFocusing());
            const total = this.timer.getCurrentSessionTotalTime();
            // 0除算回避
            this.ui.updateProgressBar(total > 0 ? remainingTime / total : 0);
        };

        this.timer.onComplete = (sessionWasFocusing) => {
            if (sessionWasFocusing === true) {
                // シーケンスの場合、各集中時間の記録ではなく、設定された集中時間を記録します
                const completedFocusMinutes = Math.floor(this.timer.currentSessionTotalTime / 60);
                this.focusRecordManager.addFocusMinutes(completedFocusMinutes);
                this.renderCalendar();
                alert('集中セッションが終了しました！');
            } else if (sessionWasFocusing === false) {
                alert('休憩セッションが終了しました！');
            }
        };

        this.timer.onSequenceComplete = () => {
            alert('全てのセッションが終了しました！');
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

    // タイマー設定が変更されたときの共通ハンドラ
    handleTimerSettingsChange() {
        if (this.timer.getIsPaused()) { // タイマーが一時停止または初期状態の場合のみ
            this.updateTimerSettings(true); // タイマーをリセットしてUI設定を適用
            this.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
            this.ui.updateProgressBar(1);
        }
    }

    startSession() {
        if (!this.timer.getIsPaused()) {
            return; // すでに稼働中なら何もしない
        }

        // タイマーが一時停止している場合でも、UIの設定値が変更されていないか確認
        // 変更されている場合は、resetSessionを呼び出して現在のUI設定で再開
        let isTimerSettingsActuallyChanged = false;
        if (this.timer.sessionSequence === null) { // 通常モードの場合
            // focusTimeInputの現在の値（分）と、タイマーに設定されている最初のフォーカス時間（秒）を比較
            if (this.ui.getFocusTimeInput() * 60 !== this.timer.initialFocusTime ||
                this.ui.isBreakEnabled() !== (this.timer.initialBreakTime > 0)) {
                isTimerSettingsActuallyChanged = true;
            }
        } else { // シーケンスモードの場合
            // 現在のUIの集中時間合計が、シーケンスの合計集中時間と異なる場合
            const totalMinutesInSequence = this.timer.sessionSequence.reduce((sum, s) => sum + (s.type === 'focus' ? s.duration : 0), 0) / 60;
            if (totalMinutesInSequence !== this.ui.getFocusTimeInput() ||
                (this.timer.sessionSequence.some(s => s.type === 'break') !== this.ui.isBreakEnabled())) {
                isTimerSettingsActuallyChanged = true;
            }
        }

        if (this.timer.getRemainingTime() <= 0 || isTimerSettingsActuallyChanged) {
            // 時間が0になっているか、または設定が変更されている場合、リセットしてから開始
            this.resetSession();
        }

        this.ui.disableStartButton();
        this.ui.enableStopButton();
        this.ui.disableTimeInputs(); // タイマー稼働中は設定変更を不可にする
        this.timer.start();
    }

    stopSession() {
        if (this.timer.getIsPaused()) {
            return; // すでに停止中なら何もしない
        }
        this.timer.pause();
        this.ui.enableStartButton();
        this.ui.enableStopButton(); // 停止後も再開できるよう、ボタンは有効のまま
        this.ui.enableTimeInputs(); // 設定変更を可能にする
    }

    resetSession() {
        this.timer.reset(); // Timerクラスのresetメソッドが内部状態をリセット
        this.updateTimerSettings(true); // UIの設定値に合わせてTimerを再設定（重要）
        this.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
        this.ui.updateProgressBar(1);
        this.ui.enableStartButton();
        this.ui.disableStopButton(); // リセット後はstopは不要
        this.ui.enableTimeInputs();
    }

    /**
     * タイマーの設定を更新し、必要であればタイマーをリセットします。
     * @param {boolean} shouldResetTimer - trueの場合、タイマーを現在のUI設定でリセットします。
     */
    updateTimerSettings(shouldResetTimer = false) {
        let focusMinutes = this.ui.getFocusTimeInput();
        let isBreakEnabled = this.ui.isBreakEnabled();

        const baseFocusTime = 3;
        const baseBreakTime = 1;

        // ルール1: 集中時間が25分以下の間は、休憩は選択不可 (UI側の制御)
        if (focusMinutes <= baseFocusTime) {
            this.ui.setBreakCheckboxDisabled(true);
            this.ui.setBreakEnabled(false);
            if (shouldResetTimer) {
                this.timer.setTimes(focusMinutes, 0); // 休憩なし(0分)に設定
            }
        }
        // ルール2: 集中時間が25分を超え、かつ休憩が選択されている場合、シーケンスを設定
        else if (focusMinutes > baseFocusTime && isBreakEnabled) {
            const sequence = [];
            let remainingFocusTime = focusMinutes;

            while (remainingFocusTime >= baseFocusTime) {
                sequence.push({ type: 'focus', duration: baseFocusTime });
                remainingFocusTime -= baseFocusTime;
                if (remainingFocusTime > 0) { // 最後の集中セッションの後に休憩はなし
                    sequence.push({ type: 'break', duration: baseBreakTime });
                }
            }
            if (remainingFocusTime > 0) { // 残りの集中時間がある場合
                sequence.push({ type: 'focus', duration: remainingFocusTime });
            }

            if (shouldResetTimer) {
                this.timer.setSessionSequence(sequence);
            }
            this.ui.setBreakCheckboxDisabled(false);
            this.ui.setBreakEnabled(true);
        }
        // ルール3: 集中時間が25分を超え、かつ休憩が選択されていない場合
        else if (focusMinutes > baseFocusTime && !isBreakEnabled) {
            this.ui.setBreakCheckboxDisabled(false);
            this.ui.setBreakEnabled(false);
            if (shouldResetTimer) {
                this.timer.setTimes(focusMinutes, 0); // 集中時間のみ設定
            }
        }
    }

    saveTasksAndGoals() {
        this.taskGoalManager.setLongTermGoal(this.ui.getLongTermGoal());
        this.taskGoalManager.saveTasksAndGoal();
        alert('タスクと長期目標を保存しました！');
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