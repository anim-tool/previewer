// ==UserScript==
// @name         Собрать информацию из ГЕД
// @namespace    http://tampermonkey.net/
// @version      2026-10-16
// @description  Собирает названия из code-блоков на странице
// @author       You
// @match        https://wiki.atlassian.mancala.games/wiki/spaces/GD/pages/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mancala.games
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Создаем плавающую кнопку
    const button = document.createElement('button');
    button.textContent = 'Собрать';
    button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 10px 15px;
        background: #007cba;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;

    // Добавляем кнопку на страницу
    document.body.appendChild(button);

    // Функция для получения массива строк1
    function getString1Array() {
        const strings1 = [];

        // Способ 1: Из выделенного текста
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
            console.log('Найдено выделение, собираем данные из выделенной области');

            // Создаем временный контейнер для поиска в выделении
            const range = selection.getRangeAt(0);
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(range.cloneContents());

            // Ищем все code в выделенной области
            const codeElements = tempDiv.querySelectorAll('code');

            if (codeElements.length > 0) {
                // Если есть code, собираем текст из них
                codeElements.forEach(code => {
                    const text = code.textContent.trim();
                    if (text) {
                        strings1.push(text);
                    }
                });
                console.log('Строки1 из выделения (code):', strings1);
            } else {
                // Если code нет, собираем текст из всех p
                const pElements = tempDiv.querySelectorAll('p');
                pElements.forEach(p => {
                    const text = p.textContent.trim();
                    if (text) {
                        strings1.push(text);
                    }
                });
                console.log('Строки1 из выделения (p, так как code не найдены):', strings1);
            }
        }

        // Способ 2: Из h2 с содержимым "Name"
        if (strings1.length === 0) {
            const nameHeader = Array.from(document.querySelectorAll('h2')).find(h2 =>
                h2.textContent.includes('Name')
            );

            if (nameHeader) {
                // Ищем следующий элемент p после h2
                let nextElement = nameHeader.nextElementSibling;
                let targetP = null;

                while (nextElement) {
                    if (nextElement.tagName === 'P') {
                        targetP = nextElement;
                        break;
                    }
                    nextElement = nextElement.nextElementSibling;
                }

                if (targetP) {
                    const codeElement = targetP.querySelector('code');
                    if (codeElement) {
                        const string1 = codeElement.textContent.trim();
                        if (string1) {
                            strings1.push(string1);
                            console.log('Строка1 из h2 Name:', string1);
                        }
                    }
                }
            }
        }

        // Способ 3: Дефолтное значение
        if (strings1.length === 0) {
            strings1.push('animation');
            console.log('Используется дефолтная строка1: animation');
        }

        return strings1;
    }

    // Функция для получения массива строк2 (названия анимаций) из таблицы
    function getString2Array() {
        const strings2 = [];

        // Ищем заголовок с содержимым "Animations" (может быть h2 или h3)
        const animHeader = Array.from(document.querySelectorAll('h2, h3')).find(header =>
            header.textContent.includes('Animations')
        );

        let table = null;

        if (animHeader) {
            console.log('Заголовок "Animations" найден, ищем таблицу после него');

            // Заголовок может быть обёрнут в контейнер (renderer-heading-wrapper),
            // тогда искать следующий элемент нужно от обёртки, а не от самого h2/h3
            let start = animHeader;
            const headingWrapper = animHeader.closest(
                '[data-testid="renderer-heading-wrapper"], .renderer-heading-wrapper'
            );
            if (headingWrapper) {
                start = headingWrapper;
            }

            // Ищем таблицу после заголовка Animations
            let nextElement = start.nextElementSibling;

            while (nextElement && !table) {
                if (nextElement.classList && nextElement.classList.contains('pm-table-wrapper')) {
                    table = nextElement.querySelector('table');
                    break;
                }
                // Также проверяем, может быть wrapper внутри следующего элемента
                const wrapper = nextElement.querySelector('.pm-table-wrapper');
                if (wrapper) {
                    table = wrapper.querySelector('table');
                    break;
                }
                nextElement = nextElement.nextElementSibling;
            }

            if (!table) {
                console.log('Таблица после заголовка Animations не найдена');
            }
        } else {
            console.log('Заголовок с содержимым "Animations" не найден');
        }

        // Если заголовка нет или после него нет таблицы — берём первую попавшуюся таблицу
        if (!table) {
            const allTables = document.querySelectorAll('.pm-table-wrapper table');
            if (allTables.length > 0) {
                console.log('Используется первая найденная таблица на странице');
                table = allTables[0];
            }
        }

        if (!table) {
            console.log('Таблицы на странице не найдены');
            return strings2;
        }

        processTable(table, strings2);
        return strings2;
    }

    // Функция для обработки таблицы
    function processTable(table, strings2) {
        // Собираем все первые ячейки из каждой строки таблицы (кроме заголовков)
        const rows = table.querySelectorAll('tbody tr');

        for (const row of rows) {
            // Пропускаем строки с th (заголовки) если они есть в tbody
            if (row.querySelector('th')) continue;

            const firstCell = row.querySelector('td:first-child');
            if (firstCell) {
                // Ищем code внутри ячейки
                const codeInCell = firstCell.querySelector('code');
                if (codeInCell) {
                    const string2 = codeInCell.textContent.trim();
                    if (string2) {
                        strings2.push(string2);
                    }
                } else {
                    // Если нет code, пробуем взять текст из p
                    const pElement = firstCell.querySelector('p');
                    if (pElement) {
                        const text = pElement.textContent.trim();
                        if (text) {
                            strings2.push(text);
                        }
                    }
                }
            }
        }

        console.log('Найдены строки2:', strings2);
    }

    // Функция для получения строк из code-элементов (в тексте, не в таблицах).
    // Подходят строки без пробелов, содержащие указанное слово.
    function getCodeLines(word) {
        const re = new RegExp(word, 'i');
        const result = [];

        // Блоки кода (<pre>/code-макросы) и инлайн <code>
        const elements = document.querySelectorAll('pre, .code-block, code');

        elements.forEach(el => {
            // Берём только текст, не таблицы
            if (el.closest('table')) return;
            // Инлайн <code> внутри блока кода уже покрыт самим блоком
            if (el.tagName === 'CODE' && el.closest('pre, .code-block')) return;

            // Строки без пробелов, содержащие указанное слово
            el.textContent
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !/\s/.test(line) && re.test(line))
                .forEach(line => result.push(line));
        });

        console.log(`Найденные строки (${word}):`, result);
        return result;
    }

    // Обработчик клика на кнопку
    button.addEventListener('click', function() {
        try {
            // Получаем строки1 (Name), названия анимаций из таблицы,
            // а также строки placeholder и event из code-элементов
            const strings1 = getString1Array();
            const strings2 = getString2Array();
            const placeholderLines = getCodeLines('placeholder');
            const eventLines = getCodeLines('event');

            if (strings2.length === 0 && placeholderLines.length === 0 && eventLines.length === 0) {
                console.log('Не найдено ни анимаций в таблице, ни строк placeholder/event в code-элементах');
                alert('Не найдено данных (анимации в таблице и строки placeholder/event). Проверьте консоль (F12) для отладки.');
                return;
            }

            // Блоки для копирования; между блоками - одна пустая строка.
            const blocksToCopy = [];

            // 1) Названия анимаций из таблицы
            if (strings2.length > 0) {
                const animLines = [];
                for (const string1 of strings1) {
                    for (const string2 of strings2) {
                        animLines.push(`${string1}|${string2}`);
                    }
                }
                blocksToCopy.push(animLines.join('\n'));
            }

            // 2) Строки с placeholder из code-элементов.
            //    Плейсхолдеры пишем через ":", между ними нет пустых строк.
            if (placeholderLines.length > 0) {
                const lines = [];
                for (const string1 of strings1) {
                    for (const line of placeholderLines) {
                        lines.push(`${string1}:${line}`);
                    }
                }
                blocksToCopy.push(lines.join('\n'));
            }

            // 3) Строки с event из code-элементов.
            //    События пишем через "~", между ними нет пустых строк.
            if (eventLines.length > 0) {
                const lines = [];
                for (const string1 of strings1) {
                    for (const line of eventLines) {
                        lines.push(`${string1}~${line}`);
                    }
                }
                blocksToCopy.push(lines.join('\n'));
            }

            const textToCopy = blocksToCopy.join('\n\n');

            // Выводим в консоль
            console.log('Строки для копирования:');
            console.log(`strings1: [${strings1.join(', ')}]`);
            console.log(`strings2: [${strings2.join(', ')}]`);
            console.log('Найденные placeholder:', placeholderLines);
            console.log('Найденные event:', eventLines);
            console.log('Результат:');
            blocksToCopy.forEach(block => console.log(block + '\n'));

            // Копируем в буфер обмена
            navigator.clipboard.writeText(textToCopy).then(() => {
                console.log('Данные успешно скопированы в буфер обмена');
                // Временно меняем текст кнопки для подтверждения
                const originalText = button.textContent;
                button.textContent = 'Скопировано!';
                button.style.background = '#28a745';

                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '#007cba';
                }, 2000);
            }).catch(err => {
                console.error('Ошибка при копировании в буфер обмена:', err);
                alert('Ошибка при копировании в буфер обмена. Проверьте консоль (F12).');
            });

        } catch (error) {
            console.error('Произошла ошибка:', error);
            alert('Произошла ошибка. Проверьте консоль (F12).');
        }
    });

    // Добавляем hover-эффект для кнопки
    button.addEventListener('mouseenter', function() {
        button.style.background = '#005a87';
    });

    button.addEventListener('mouseleave', function() {
        if (button.textContent === 'Собрать') {
            button.style.background = '#007cba';
        }
    });

    // Добавляем небольшую задержку для гарантии загрузки DOM
    setTimeout(() => {
        console.log('Скрипт инициализирован. Кнопка "Собрать" добавлена.');
    }, 1000);
})();