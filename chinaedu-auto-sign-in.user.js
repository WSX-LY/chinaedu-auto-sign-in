// ==UserScript==
// @name         弘成云直播自动签到
// @namespace    https://txfront.chinaedu.net/
// @version      1.2.1
// @description  在弘成云直播的签到弹窗出现时，自动点击「立即签到」。
// @match        https://txfront.chinaedu.net/cedulive/cedulivepcweb/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const selector = '.sign-in-container .btn-sign-in';
    const clicked = new WeakSet();
    const logPrefix = '[弘成云直播自动签到]';
    const logKey = 'chinaedu-sign-in-diagnostics';
    let entries = [];
    let previousState = '';

    try {
        entries = JSON.parse(sessionStorage.getItem(logKey) || '[]');
        if (!Array.isArray(entries)) entries = [];
    } catch {
        console.warn(logPrefix, '无法读取之前的诊断日志。');
    }

    function log(message, details) {
        const entry = { time: new Date().toISOString(), message, details };
        entries.push(entry);
        entries = entries.slice(-100);
        try {
            sessionStorage.setItem(logKey, JSON.stringify(entries));
        } catch {
            // The console remains available if storage is blocked.
        }
        console.info(logPrefix, JSON.stringify(entry));
    }

    function checkSignIn() {
        const states = [];
        const ready = [];
        for (const button of document.querySelectorAll(selector)) {
            const visible = Boolean(button.getClientRects().length) &&
                getComputedStyle(button).visibility === 'visible';
            const signIn = button.textContent.trim() === '立即签到';
            const success = visible && Boolean(
                button.closest('.sign-in-container').querySelector('.sign-in-success')
            );
            if (!signIn || !visible) {
                clicked.delete(button);
            }

            const disabled = button.matches(':disabled, [aria-disabled="true"]');
            const attempted = clicked.has(button);
            states.push({ signIn, visible, disabled, attempted, success });
            if (signIn && visible && !disabled && !attempted) ready.push(button);
        }

        const snapshot = {
            page: location.hash.split(/[?&]/, 1)[0] === '#/meeting-home' ? '直播间' : '其他页面',
            online: navigator.onLine,
            inFrame: window.top !== window,
            panel: Boolean(document.querySelector('.sign-in-container')),
            listButtons: document.querySelectorAll('.sign-in-container .item-state-not-sign').length,
            buttons: states,
        };
        const state = JSON.stringify(snapshot);
        if (state !== previousState) {
            previousState = state;
            log('页面签到状态变化', snapshot);
        }

        for (const button of ready) {
            clicked.add(button);
            try {
                button.click();
                log('已发出「立即签到」点击');
            } catch (error) {
                log('调用点击时抛出异常', { name: error?.name });
            }
            setTimeout(checkSignIn, 0);
        }
    }

    const observer = new MutationObserver(checkSignIn);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'disabled', 'aria-disabled'],
    });
    for (const event of ['hashchange', 'online', 'offline']) {
        window.addEventListener(event, checkSignIn);
    }
    log('脚本已启动', { version: '1.2.1' });
    checkSignIn();
})();
