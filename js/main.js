var d = document,
    w = window;

w.onload = function () {
    var AudioTrap = function () {
        var trap = this,
            context = null,
            canva = null,
            ctx = null,
            node = null,
            analyser = null,
            destination = null,
            convolver = null; //Свертка

        this.init = function () {
            var audioContext = w.audioContext || w.webkitAudioContext;
            navigator.getMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
            try {
                this.createCanvas(d.querySelector("#target"));
                context = new audioContext();
                destination = context.destination;
                node = context.createScriptProcessor(2048, 1, 1);
                navigator.getMedia({ audio: true }, trap.getStriam, trap.catchError);
            } catch (e) {
                throw (e.message);
            }
        };
        /*
        * перехватывает сигнал с микрофона
        */
        this.getStriam = function (striam) {
            var source = context.createMediaStreamSource(striam);
            trap.createAnalyser();
            trap.strimProcessing(source);
        };
        /*
        * Вывод ошибок
        */
        this.catchError = function (err) {
            throw (err);
        }
        /*
        * Создание конвы и вставка её на страницу
        * @param {Object} el - куда вставлять канву
        */
        this.createCanvas = function (el) {
            el = el || d.body;
            canva = d.createElement("canvas");
            ctx = canva.getContext("2d");
            canva.width = 600;
            canva.height = 250;
            el.appendChild(canva);
        };
        /*
        * Создает анализатор для входного сигнала
        */
        this.createAnalyser = function () {
            analyser = context.createAnalyser();
            analyser.smoothingTimeConstant = 0.3;
            analyser.fftSize = 512;
        };
        /*
        * Отрисовка входного сигнала на канве
        * @param {Array} array - частотная характеристика сигнала
        */
        this.draw = function (array) {
            var ln = array.length;
            ctx.clearRect(0, 0, canva.width, canva.height);

            ctx.fillStyle = '#F6D565';
            ctx.lineCap = 'round';

            for (var i = 0; i < ln; ++i) {
                var magnitude = 0;
                var loc = array[i];
                ctx.fillStyle = "hsl( " + Math.round((i * 360) / Math.round(canva.width / 2)) + ", 100%, 50%)";
                ctx.fillRect(i * 5, canva.height, 3, -loc);
            }
        };

        this.strimProcessing = function (source) {
            var loader = new BufferLoader(context, [
                    "effects/breath.mp3"
                ], function (buffers) {
                    //Фоновый звук
                    new bgSound(buffers);
                    //подключаем анализатор к источнику
                    source.connect(analyser);
                    //подключаем анализатор к интерфейсу обработки данных
                    analyser.connect(node);
                    node.connect(destination);
                    source.connect(destination);
                    //тут отлавливаем данные для построения графика
                    node.onaudioprocess = function () {
                        var array = new Uint8Array(analyser.frequencyBinCount);
                        analyser.getByteFrequencyData(array);
                        trap.draw(array);
                    };
                });
            loader.load();
        }

        /*
        * Добавляет фоновый звук
        * @param {Array} buffers - буффер
        */
        var bgSound = function (buffers) {
            var bg = this;
            this.gainSel = d.querySelector('#bg-gain');
            this.isPlaying = false;
            this.buffers = buffers;

            this.play();

            setInterval(function () {
                bg.isPlaying ? bg.stop() : bg.play();
                bg.isPlaying = !bg.isPlaying;
            }, 2000);

            //Изменение уровня сигнала
            this.gainSel.addEventListener('change', function () {
                bg.gainNode.gain.value = this.value;
            }, false);
        };

        bgSound.prototype.play = function () {
            this.bg = context.createBufferSource();
            this.bg.buffer = this.buffers[0];
            //Усилитель
            this.gainNode = context.createGain();
            this.gainNode.gain.value = this.gainSel.value || 0.1;

            this.bg.connect(this.gainNode);
            this.gainNode.connect(destination);

            this.bg.start(0);
            this.isPlaying = true;
        };

        bgSound.prototype.stop = function () {
            this.bg.stop(0);
        };
    };
    //Загрузка 
    var BufferLoader = function (context, urlList, callback) {
        this.context = context;
        this.urlList = urlList;
        this.onload = callback;
        this.bufferList = new Array();
        this.loadCount = 0;
    };

    BufferLoader.prototype.load = function () {
        for (var i = 0; i < this.urlList.length; ++i) {
            this.loadBuffer(this.urlList[i], i);
        }
    };

    BufferLoader.prototype.loadBuffer = function (url, index) {
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        var loader = this;

        request.onload = function () {
            loader.context.decodeAudioData(
                request.response,
                function (buffer) {
                    if (!buffer) {
                        alert('error decoding file data: ' + url);
                        return;
                    }
                    loader.bufferList[index] = buffer;
                    if (++loader.loadCount == loader.urlList.length) {
                        loader.onload(loader.bufferList);
                    }
                },
                function (error) {
                    console.error('decodeAudioData error', error);
                }
            );
        }

        request.onerror = function () {
            alert('BufferLoader: XHR error');
        }

        request.send();
    };

    var trap = new AudioTrap();
    //погнали
    trap.init();
};