document.addEventListener('DOMContentLoaded', function () {
    var reminderInput = document.getElementById('reminderInput');
    var addReminderButton = document.getElementById('addReminderButton');
    var reminderList = document.getElementById('reminderList');
    var draging = null;

    // Load reminders from local storage
    chrome.storage.local.get('reminders', function(data) {
        if (data.reminders) {
            data.reminders.forEach(function(reminder) {
                addReminderToUI(reminder.text, reminder.id); // Pass both text and id
            });
        }
    });

    // Add reminder when button clicked or Enter key pressed
    function addReminder() {
        var reminderText = reminderInput.value;
        if (reminderText.trim() !== '') {
            var reminderId = 'reminder_' + Math.random().toString(36).substr(2, 9); // Generate a unique ID for the reminder
            addReminderToUI(reminderText, reminderId); // Pass both text and id
            saveReminder(reminderText, reminderId); // Pass both text and id
            reminderInput.value = '';
        }
    }

    addReminderButton.addEventListener('click', addReminder);
    reminderInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            addReminder();
        }
    });

    // Add reminder item to UI
    function addReminderToUI(reminderText, reminderId) {
        var reminderItem = document.createElement('li');
        reminderItem.classList.add('reminder-item');
        reminderItem.draggable = true;
        reminderItem.setAttribute('data-reminder-id', reminderId); // Set the ID as a data attribute
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('checkbox-custom');
        var reminderTextSpan = document.createElement('span');
        reminderTextSpan.textContent = reminderText;

        checkbox.addEventListener('change', function(event) {
            var index = Array.from(reminderList.children).indexOf(reminderItem); // Get the index of the reminder item
            if (event.target.checked) {
                reminderTextSpan.style.textDecoration = 'line-through';
                reminderTextSpan.style.color = '#999';
                removeCheckedReminder(reminderId); // Pass the reminder ID to the function
            } else {
                reminderTextSpan.style.textDecoration = 'none';
                reminderTextSpan.style.color = '#000';
                saveReminder(reminderText, reminderId, index); // Pass both text, id, and index
            }
        });

        reminderItem.appendChild(checkbox);
        reminderItem.appendChild(reminderTextSpan);
        reminderList.appendChild(reminderItem);
    }

    // Drag and drop functionality
    reminderList.ondragstart = function(event) {
        event.dataTransfer.setData("text", event.target.getAttribute('data-reminder-id'));
        draging = event.target;
    };

    reminderList.ondragover = function(event) {
        event.preventDefault();
        var target = event.target;
        if (target.nodeName === "LI" && target !== draging) {
            var targetRect = target.getBoundingClientRect();
            var dragingRect = draging.getBoundingClientRect();
            if (!target.animated) {
                if (_index(draging) < _index(target)) {
                    target.parentNode.insertBefore(draging, target.nextSibling);
                } else {
                    target.parentNode.insertBefore(draging, target);
                }
                _animate(dragingRect, draging);
                _animate(targetRect, target);
            }
        }
        updateRemindersOrder();
    };

    function _index(el) {
        var index = 0;
        if (!el || !el.parentNode) {
            return -1;
        }
        while (el && (el = el.previousElementSibling)) {
            index++;
        }
        return index;
    }

    function _animate(prevRect, target) {
        var ms = 300;
        if (ms) {
            var currentRect = target.getBoundingClientRect();
            if (prevRect.nodeType === 1) {
                prevRect = prevRect.getBoundingClientRect();
            }
            _css(target, 'transition', 'none');
            _css(target, 'transform', 'translate3d(' +
                (prevRect.left - currentRect.left) + 'px,' +
                (prevRect.top - currentRect.top) + 'px,0)'
            );
            target.offsetWidth;
            _css(target, 'transition', 'all ' + ms + 'ms');
            _css(target, 'transform', 'translate3d(0,0,0)');
            clearTimeout(target.animated);
            target.animated = setTimeout(
                function() {
                _css(target, 'transition', '');
                _css(target, 'transform', '');
                target.animated = false;
                },
                ms
            );
        }
    }

    function _css(el, prop, val) {
        var style = el && el.style;
        if (style) {
            if (val === void 0) {
                if (document.defaultView && document.defaultView.getComputedStyle) {
                    val = document.defaultView.getComputedStyle(el, '');
                } else if (el.currentStyle) {
                    val = el.currentStyle;
                }
                return prop === void 0 ? val : val[prop];
            } else {
                if (!(prop in style)) {
                    prop = '-webkit-' + prop;
                }
                style[prop] = val + (typeof val === 'string' ? '' : 'px');
            }
        }
    }

    // Save reminder to local storage with ID
    function saveReminder(reminderText, reminderId, index) {
        chrome.storage.local.get('reminders', function(data) {
            var reminders = data.reminders || [];
            if (index !== undefined) {
                reminders.splice(index, 0, { id: reminderId, text: reminderText }); // Insert reminder at the original index
            } else {
                reminders.push({ id: reminderId, text: reminderText }); // Append reminder if index is not specified
            }
            chrome.storage.local.set({ 'reminders': reminders });
        });
    }

    // Remove checked reminder from local storage
    function removeCheckedReminder(reminderId) {
        chrome.storage.local.get('reminders', function(data) {
            var reminders = data.reminders || [];
            var index = reminders.findIndex(function(item) {
                return item.id === reminderId; // Find the index of the reminder with matching ID
            });
            if (index !== -1) {
                reminders.splice(index, 1);
                chrome.storage.local.set({ 'reminders': reminders });
            }
        });
    }

    // Update the order of reminders in local storage after dragging
    function updateRemindersOrder() {
        var reminderItems = document.querySelectorAll('.reminder-item');
        var newOrder = [];
        reminderItems.forEach(function(item) {
            var reminderId = item.getAttribute('data-reminder-id');
            var reminderText = item.querySelector('span').textContent;
            newOrder.push({ id: reminderId, text: reminderText });
        });

        // 更新 reminderItems 陣列中的元素順序
        reminderItems = Array.from(reminderItems).sort(function(a, b) {
            return _index(a) - _index(b);
        });

        chrome.storage.local.set({ 'reminders': newOrder }, function() {
            console.log('Reminders order updated successfully.');
        });
    }

});
