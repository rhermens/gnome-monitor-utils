import Gio from "gi://Gio";
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

export default class MonitorUtilsExtension extends Extension {
    private _settings?: Gio.Settings;
    private primaryMonitorIndex: number = 0;
    private secondaryMonitorIndex: number = 0;

    enable(): void {
        this._settings = this.getSettings();
        this.primaryMonitorIndex = global.display.get_primary_monitor();
        this.secondaryMonitorIndex = this._settings.get_int('secondary-monitor');

        Main.wm.addKeybinding(
            'swap-monitors-keybind',
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL,
            this._swap_monitors.bind(this)
        );
    }

    disable(): void {
        Main.wm.removeKeybinding('swap-monitors-keybind');
    }

    private _swap_monitors(): void {
        const focusedMonitorIndex = global.display.get_focus_window().get_monitor();

        const swapOrigin = focusedMonitorIndex;
        const swapTarget = focusedMonitorIndex === this.primaryMonitorIndex 
            ? this.secondaryMonitorIndex 
            : this.primaryMonitorIndex;

        if (swapOrigin === swapTarget) return;

        for (const window of global.display.list_all_windows()) {
            if (window.get_monitor() === swapOrigin) {
                window.move_to_monitor(swapTarget);
                continue;
            }

            if (window.get_monitor() === swapTarget) {
                window.move_to_monitor(swapOrigin);
                continue;
            }
        }
    }
}
