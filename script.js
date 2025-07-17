// ===============================================
// 1. StorageManager クラス
// ===============================================
// StorageManager は、直接 LocalStorage を操作する静的ユーティリティクラスです。
// テスト時にモックしやすいように、StorageManager を介して LocalStorage にアクセスします。
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
// Timer クラスは、ポモドーロタイマーのコアロジックを管理します。
class Timer {
    constructor(onTick, onComplete, onSequenceComplete) {
        this.onTick = onTick; // 1秒ごとに呼ばれるコールバック
        this.onComplete = onComplete; // 一つのセッションが終了したときに呼ばれるコールバック (集中/休憩)
        this.onSequenceComplete = onSequenceComplete; // シーケンス全体が終了したときに呼ばれるコールバック

        this.initialFocusTime = 25 * 60; // デフォルトの集中時間（秒）
        this.initialBreakTime = 5 * 60; // デフォルトの休憩時間（秒）

        this.focusTime = this.initialFocusTime;
        this.breakTime = this.initialBreakTime;
        this.isFocusing = true; // 現在フォーカスセッション中か休憩セッション中か
        this.remainingTime = this.focusTime; // 現在のセッションの残り時間
        this.currentSessionTotalTime = this.focusTime; // 現在のセッションの合計時間（プログレスバー用）
        this.intervalId = null;
        this.isPaused = true;

        this.elapsedFocusTime = 0; // その日の累計集中時間（秒）

        // シーケンス関連のプロパティ
        this.sessionSequence = null; // 例: [{ type: 'focus', duration: 25 }, { type: 'break', duration: 5 }]
        this.currentSessionIndex = 0;
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
        // シーケンスの最初のセッションの種類に基づいて isFocusing を設定
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
            if (this.isFocusing) { // 集中セッション中のみ経過時間をカウント
                this.elapsedFocusTime++;
            }
            this.onTick(this.remainingTime, this.isFocusing); // UI更新コールバック

            if (this.remainingTime <= 0) {
                this.pause();
                const sessionWasFocusing = this.isFocusing; // セッション完了時の種類を保持

                this.onComplete(sessionWasFocusing); // セッション完了コールバック

                if (this.sessionSequence) {
                    this.currentSessionIndex++;
                    if (this.currentSessionIndex < this.sessionSequence.length) {
                        // 次のセッションへ
                        const nextSession = this.sessionSequence[this.currentSessionIndex];
                        this.isFocusing = (nextSession.type === 'focus');
                        this.remainingTime = nextSession.duration;
                        this.currentSessionTotalTime = this.remainingTime;
                        this.start(); // 次のセッションを開始
                    } else {
                        // シーケンス全体が終了
                        this.onSequenceComplete();
                        this.sessionSequence = null; // シーケンスモードを解除
                        this.currentSessionIndex = 0;
                    }
                } else {
                    // 通常モードの場合、集中と休憩を切り替え
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

        if (this.sessionSequence) {
            // シーケンスモードの場合、最初のセッションに戻る
            this.currentSessionIndex = 0;
            const firstSession = this.sessionSequence[0];
            this.isFocusing = (firstSession.type === 'focus');
            this.remainingTime = firstSession.duration;
            this.currentSessionTotalTime = this.remainingTime;
        } else {
            // 通常モードの場合、初期集中時間に戻る
            this.isFocusing = true;
            this.focusTime = this.initialFocusTime;
            this.breakTime = this.initialBreakTime;
            this.remainingTime = this.focusTime;
            this.currentSessionTotalTime = this.focusTime;
        }
        this.onTick(this.remainingTime, this.isFocusing); // UIを初期状態に更新
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
        // 現在のセッション（集中または休憩）の合計時間を返す
        // シーケンスモードの場合は現在のシーケンスアイテムのduration
        if (this.sessionSequence && this.sessionSequence[this.currentSessionIndex]) {
            return this.sessionSequence[this.currentSessionIndex].duration;
        }
        return this.isFocusing ? this.focusTime : this.breakTime;
    }

    // 新規追加: 現在のタイマー状態を取得する
    getState() {
        return {
            remainingTime: this.remainingTime,
            isFocusing: this.isFocusing,
            isPaused: this.isPaused,
            initialFocusTime: this.initialFocusTime,
            initialBreakTime: this.initialBreakTime,
            focusTime: this.focusTime, // 現在設定されている集中時間
            breakTime: this.breakTime, // 現在設定されている休憩時間
            sessionSequence: this.sessionSequence,
            currentSessionIndex: this.currentSessionIndex,
            elapsedFocusTime: this.elapsedFocusTime
        };
    }

    // 新規追加: タイマー状態を設定する
    setState(state) {
        if (state) {
            this.remainingTime = state.remainingTime;
            this.isFocusing = state.isFocusing;
            this.isPaused = state.isPaused; // 保存された一時停止状態をセット
            this.initialFocusTime = state.initialFocusTime || 25 * 60;
            this.initialBreakTime = state.initialBreakTime || 5 * 60;
            this.focusTime = state.focusTime || this.initialFocusTime;
            this.breakTime = state.breakTime || this.initialBreakTime;
            this.sessionSequence = state.sessionSequence;
            this.currentSessionIndex = state.currentSessionIndex; // 'currentSequenceIndex' から 'currentSessionIndex' に修正
            this.elapsedFocusTime = state.elapsedFocusTime;

            // プログレスバーの計算用に currentSessionTotalTime を再設定
            if (this.sessionSequence && this.sessionSequence[this.currentSessionIndex]) {
                this.currentSessionTotalTime = this.sessionSequence[this.currentSessionIndex].duration;
            } else {
                this.currentSessionTotalTime = this.isFocusing ? this.focusTime : this.breakTime;
            }

            // UIを更新
            this.onTick(this.remainingTime, this.isFocusing);
        }
    }
}

// ===============================================
// 3. UserInterface クラス
// ===============================================
// UserInterface クラスは、DOM要素へのアクセスとUIの更新を担当します。
class UserInterface {
    constructor() {
        this.timerDisplay = document.getElementById('timer-display');
        this.progressBar = document.getElementById('progress-bar');
        this.focusTimeInput = document.getElementById('focus-time');
        this.enableBreakCheckbox = document.getElementById('enable-break');
        this.startButton = document.getElementById('start-button');
        this.stopButton = document.getElementById('stop-button');
        this.resetButton = document.getElementById('reset-button');
        this.longTermGoalInput = document.getElementById('long-term-goal');
        this.saveTasksButton = document.getElementById('save-tasks-button');
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
        this.progressBar.style.width = `${progress}%`; // progressは0-100の数値
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

    setStartButtonEnabled(enabled) {
        this.startButton.disabled = !enabled;
    }

    setStopButtonEnabled(enabled) {
        this.stopButton.disabled = !enabled;
    }

    setTimerSettingsEnabled(enabled) {
        this.focusTimeInput.disabled = !enabled;
        this.enableBreakCheckbox.disabled = !enabled;
        // ここでプリセットボタンも無効化するなら追加
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
        // 既存の日付セルをクリア (曜日名を除く)
        while (this.calendarGrid.children.length > 7) {
            this.calendarGrid.removeChild(this.calendarGrid.lastChild);
        }

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const numDays = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0: 日曜日, 1: 月曜日, ...

        // 空のセルを追加して、1日を正しい曜日に合わせる
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

            // 今日の日付をハイライト
            if (dateStr === todayStr) {
                dayCell.classList.add('current-day');
            }

            const dateNumber = document.createElement('span');
            dateNumber.classList.add('date-number');
            dateNumber.textContent = i;
            dayCell.appendChild(dateNumber);

            // 集中記録の表示
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
// FocusRecordManager は、日ごとの集中時間記録を管理します。
class FocusRecordManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
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
        // 修正: this.storageManager (StorageManagerクラス) の静的メソッドを呼び出す
        this.storageManager.save('focusRecords', this.records);
    }

    loadRecords() {
        // 修正: this.storageManager (StorageManagerクラス) の静的メソッドを呼び出す
        const loadedRecords = this.storageManager.load('focusRecords');
        if (loadedRecords) {
            this.records = loadedRecords;
        }
    }
}

// ===============================================
// 5. TaskGoalManager クラス
// ===============================================
// TaskGoalManager は、長期目標とタスクリストを管理します。
class TaskGoalManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.longTermGoal = '';
        this.tasks = [];
        this.loadTasksAndGoal();
    }

    saveTasksAndGoal() {
        // 修正: this.storageManager (StorageManagerクラス) の静的メソッドを呼び出す
        this.storageManager.save('longTermGoal', this.longTermGoal);
        this.storageManager.save('tasks', this.tasks);
    }

    loadTasksAndGoal() {
        // 修正: this.storageManager (StorageManagerクラス) の静的メソッドを呼び出す
        const loadedGoal = this.storageManager.load('longTermGoal');
        if (typeof loadedGoal === 'string') {
            this.longTermGoal = loadedGoal;
        }
        // 修正: this.storageManager (StorageManagerクラス) の静的メソッドを呼び出す
        const loadedTasks = this.storageManager.load('tasks');
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
// 6. App クラス (メインロジック)
// ===============================================
// App クラスは、アプリケーションのメインロジックと各コンポーネントの連携を管理します。
class App {
    constructor() {
        this.ui = new UserInterface();
        // 修正: StorageManagerのインスタンスではなく、クラス自体を渡す
        this.focusRecordManager = new FocusRecordManager(StorageManager);
        this.taskGoalManager = new TaskGoalManager(StorageManager);

        // Timerインスタンスの作成時にコールバックを渡す
        this.timer = new Timer(
            (remainingTime, isFocusing) => {
                this.ui.updateTimerDisplay(remainingTime, isFocusing);
                const total = this.timer.getCurrentSessionTotalTime();
                const progress = total > 0 ? (remainingTime / total) * 100 : 0; // パーセンテージで渡す
                this.ui.updateProgressBar(progress);
            },
            (sessionWasFocusing) => this.handleSessionComplete(sessionWasFocusing),
            () => this.handleSequenceComplete()
        );

        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
    }

    init() {
        this.loadAllData();
        this.setupEventListeners();

        // UIの初期表示
        this.ui.renderTaskList(this.taskGoalManager.getTasks(),
            this.deleteTask.bind(this),
            this.toggleTaskCompletion.bind(this));
        this.ui.renderCalendar(this.currentYear, this.currentMonth, this.focusRecordManager.getRecordsForMonth(this.currentYear, this.currentMonth));
        this.ui.setLongTermGoal(this.taskGoalManager.getLongTermGoal());

        const savedTimerState = StorageManager.load('timerState');
        if (savedTimerState) {
            this.timer.setState(savedTimerState); // ここでTimerインスタンスの状態は復元される

            // ここからUIの表示とボタンの状態を調整
            // 重要: savedTimerState の isPaused プロパティが true の場合、タイマーは停止状態から開始すべき
            if (!this.timer.getIsPaused() && this.timer.getRemainingTime() > 0) {
                // タイマーが稼働中だった場合
                this.ui.setStartButtonEnabled(false);
                this.ui.setStopButtonEnabled(true);
                this.ui.setTimerSettingsEnabled(false); // 稼働中は設定変更不可
                this.timer.start(); // 自動で再開
            } else {
                // タイマーが一時停止中だった場合、または時間が0だった場合
                this.ui.setStartButtonEnabled(true);
                this.ui.setStopButtonEnabled(true); // 一時停止中の停止ボタンは有効のまま
                this.ui.setTimerSettingsEnabled(true); // 一時停止中は設定変更可能
            }
            
            // ★重要: ここで現在のタイマー状態に基づいてUIを明示的に更新する
            this.ui.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
            const total = this.timer.getCurrentSessionTotalTime();
            const progress = total > 0 ? (this.timer.getRemainingTime() / total) * 100 : 100; // 時間が0なら100% (満タン)
            this.ui.updateProgressBar(progress);

            // 背景色のクラスもsetStateで onTick が呼ばれるので更新されるはずだが、念のため init の最後でも確認
            document.body.className = this.timer.getIsFocusing() ? 'focusing' : 'break-time';
            this.ui.timerDisplay.className = `timer-display ${this.timer.getIsFocusing() ? 'focusing' : 'break-time'}`;


        } else {
            // 保存された状態がない場合、デフォルトのUI状態を設定し、タイマーをリセット
            this.ui.setStartButtonEnabled(true);
            this.ui.setStopButtonEnabled(false);
            this.ui.setTimerSettingsEnabled(true);
            this.timer.reset(); // これでタイマーは初期状態 (25:00, focus, paused) になる

            // ★重要: デフォルト状態の場合もUIを更新
            this.ui.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
            this.ui.updateProgressBar(100); // 100%に設定

            document.body.classList.remove('focusing', 'break-time'); // デフォルトに戻す
            this.ui.timerDisplay.classList.remove('focusing', 'break-time'); // デフォルトに戻す
        }
    }

    loadAllData() {
        this.taskGoalManager.loadTasksAndGoal();
        this.focusRecordManager.loadRecords();
        // タイマーの状態は init の中で別途読み込む
    }

    setupEventListeners() {
        this.ui.startButton.addEventListener('click', () => {
            this.startSession();
            this.saveTimerState(); // タイマー開始時に状態を保存
        });
        this.ui.stopButton.addEventListener('click', () => {
            this.pauseSession();
            this.saveTimerState(); // タイマー停止時に状態を保存
        });
        this.ui.resetButton.addEventListener('click', () => {
            this.resetSession();
            this.saveTimerState(); // タイマーリセット時に状態を保存
        });

        // 集中時間入力と休憩チェックボックスの変更イベント
        this.ui.focusTimeInput.addEventListener('change', () => {
            this.handleTimerSettingsChange();
            this.saveTimerState(); // 設定変更時にも状態を保存
        });
        this.ui.enableBreakCheckbox.addEventListener('change', () => {
            this.handleTimerSettingsChange();
            this.saveTimerState(); // 設定変更時にも状態を保存
        });

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

    // タイマー設定が変更されたときの共通ハンドラ
    handleTimerSettingsChange() {
        if (this.timer.getIsPaused()) { // タイマーが一時停止または初期状態の場合のみ
            this.updateTimerSettings(true); // タイマーをリセットしてUI設定を適用
            this.ui.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
            const total = this.timer.getCurrentSessionTotalTime();
            this.ui.updateProgressBar(total > 0 ? (this.timer.getRemainingTime() / total) * 100 : 100);
        } else {
            // タイマーが稼働中に設定を変更しても即座には適用されないことを示す（UIは有効化しない）
            // UIの disabled 状態は App.startSession / pauseSession / resetSession で制御される
        }
    }

    startSession() {
        console.log('startSession() 呼び出し');
        console.log('現在の状態: isPaused=', this.timer.getIsPaused(), ' remainingTime=', this.timer.getRemainingTime());

        // ケース1: タイマーが稼働中であれば、何もしない
        if (!this.timer.getIsPaused()) {
            console.log('タイマーが既に稼働中のため、何もしません。');
            return;
        }

        // ケース2: タイマーが一時停止中で、残り時間がある状態からの再開
        // この場合はリセットせず、そのままスタートする
        if (this.timer.getIsPaused() && this.timer.getRemainingTime() > 0) {
            console.log('一時停止中から再開します。');
            // ここではresetSession()を呼ばない！
        } 
        // ケース3: タイマーが一時停止中だが、残り時間が0、または設定が変更されている場合
        // この場合は、設定変更チェックを行う
        else { // this.timer.getIsPaused() が true の状態
            let isTimerSettingsActuallyChanged = false;
            // 現在のUIの入力値とタイマーの初期設定値を比較（シーケンスモードでない場合）
            if (this.timer.sessionSequence === null) {
                const currentFocusInput = this.ui.getFocusTimeInput();
                const currentBreakEnabled = this.ui.isBreakEnabled();
                // タイマーのinitialFocusTime/initialBreakTimeは秒なので分に変換して比較
                if (currentFocusInput * 60 !== this.timer.initialFocusTime ||
                    (currentBreakEnabled && this.timer.initialBreakTime === 0) ||
                    (!currentBreakEnabled && this.timer.initialBreakTime > 0)) {
                    isTimerSettingsActuallyChanged = true;
                }
            } else {
                // シーケンスモードでの設定変更チェック (複雑なため以前のロジックを維持)
                const totalFocusMinutesInUI = this.ui.getFocusTimeInput();
                const isBreakEnabledInUI = this.ui.isBreakEnabled();
                
                const totalFocusSecondsInTimerSequence = this.timer.sessionSequence.reduce((sum, s) => sum + (s.type === 'focus' ? s.duration : 0), 0);
                const hasBreakInTimerSequence = this.timer.sessionSequence.some(s => s.type === 'break');

                if (totalFocusMinutesInUI * 60 !== totalFocusSecondsInTimerSequence ||
                    isBreakEnabledInUI !== hasBreakInTimerSequence) {
                    isTimerSettingsActuallyChanged = true;
                }
            }

            if (this.timer.getRemainingTime() <= 0 || isTimerSettingsActuallyChanged) {
                console.log('残り時間が0か設定変更あり: resetSession() を呼び出します。');
                this.resetSession(); // リセットしてから開始
            }
        }
        
        // タイマーを開始
        this.timer.start();
        console.log('タイマーを開始しました。');

        // UIの状態を更新
        this.ui.setStartButtonEnabled(false);
        this.ui.setStopButtonEnabled(true);
        this.ui.setTimerSettingsEnabled(false); // タイマー稼働中は設定変更を不可にする
        document.body.classList.add('focusing');
        document.body.classList.remove('break-time'); // 念のため
        this.ui.timerDisplay.classList.add('focusing');
        this.ui.timerDisplay.classList.remove('break-time'); // 念のため
    }

    pauseSession() {
        if (this.timer.getIsPaused()) {
            return; // すでに停止中なら何もしない
        }
        this.timer.pause();
        this.ui.setStartButtonEnabled(true);
        this.ui.setStopButtonEnabled(true); // 停止後も再開できるよう、ボタンは有効のまま
        this.ui.setTimerSettingsEnabled(true); // 設定変更を可能にする
    }

    resetSession() {
        this.timer.reset(); // Timerクラスのresetメソッドが内部状態をリセット
        this.updateTimerSettings(true); // UIの設定値に合わせてTimerを再設定（重要）
        this.ui.setStartButtonEnabled(true);
        this.ui.setStopButtonEnabled(false); // リセット後はstopは不要
        this.ui.setTimerSettingsEnabled(true);
        document.body.classList.remove('focusing', 'break-time');
        this.ui.timerDisplay.classList.remove('focusing', 'break-time');
        this.ui.updateTimerDisplay(this.timer.getRemainingTime(), this.timer.getIsFocusing());
        this.ui.updateProgressBar(100); // プログレスバーを100%にリセット
    }

    /**
     * タイマーの設定をUIの入力値に基づいて更新し、必要であればタイマーをリセットします。
     * @param {boolean} shouldResetTimer - trueの場合、タイマーを現在のUI設定でリセットします。
     */
    updateTimerSettings(shouldResetTimer = false) {
        let focusMinutes = this.ui.getFocusTimeInput();
        let isBreakEnabled = this.ui.isBreakEnabled();

        const baseFocusTime = 3; // 集中セッションの基本単位（分）
        const baseBreakTime = 1; // 休憩セッションの基本単位（分）

        // ルール1: 集中時間が baseFocusTime (3分) 以下の間は、休憩は選択不可
        if (focusMinutes <= baseFocusTime) {
            this.ui.setBreakCheckboxDisabled(true);
            this.ui.setBreakEnabled(false); // 強制的に休憩なしにする
            if (shouldResetTimer) {
                this.timer.setTimes(focusMinutes, 0); // 休憩なし(0分)に設定
            }
        }
        // ルール2: 集中時間が baseFocusTime (3分) を超え、かつ休憩が選択されている場合、シーケンスを設定
        else if (focusMinutes > baseFocusTime && isBreakEnabled) {
            const sequence = [];
            let remainingFocusTime = focusMinutes;

            while (remainingFocusTime >= baseFocusTime) {
                sequence.push({ type: 'focus', duration: baseFocusTime });
                remainingFocusTime -= baseFocusTime;
                if (remainingFocusTime > 0) { // 残りの集中時間がある場合のみ休憩を追加
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
            this.ui.setBreakEnabled(true); // UIの設定を維持
        }
        // ルール3: 集中時間が baseFocusTime (3分) を超え、かつ休憩が選択されていない場合
        else if (focusMinutes > baseFocusTime && !isBreakEnabled) {
            this.ui.setBreakCheckboxDisabled(false); // 選択は可能にするが、現在選択されていない状態を維持
            this.ui.setBreakEnabled(false); // UIの設定を維持
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

    handleSessionComplete(sessionWasFocusing) {
        if (sessionWasFocusing === true) {
            // 集中セッションが完了したとき、elapsedFocusTime（秒）を分に変換して記録
            const completedFocusMinutes = Math.floor(this.timer.elapsedFocusTime / 60);
            if (completedFocusMinutes > 0) {
                this.focusRecordManager.addFocusMinutes(completedFocusMinutes);
                this.renderCalendar(); // カレンダーを更新
            }
            this.timer.elapsedFocusTime = 0; // 記録後、経過集中時間をリセット
            alert('集中セッションが終了しました！');
        } else if (sessionWasFocusing === false) {
            alert('休憩セッションが終了しました！');
        }
        this.saveTimerState(); // セッション完了時にも状態を保存
    }

    handleSequenceComplete() {
        alert('全てのセッションが終了しました！');
        this.resetSession();
        this.saveTimerState(); // シーケンス完了時にも状態を保存
    }

    renderCalendar() {
        const records = this.focusRecordManager.getRecordsForMonth(this.currentYear, this.currentMonth);
        this.ui.renderCalendar(this.currentYear, this.currentMonth, records);
    }

    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.renderCalendar();
    }

    // 新規追加: タイマーの状態を保存する
    saveTimerState() {
        // 修正: StorageManager.save を直接呼び出す
        StorageManager.save('timerState', this.timer.getState());
    }
}

// アプリケーションのエントリーポイント
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
