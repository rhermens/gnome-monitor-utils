import Gio from "gi://Gio";
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { KeybindSettings } from "./settings.js";

export default class MonitorUtilsExtension extends Extension {
    private _settings?: Gio.Settings;
    private primaryMonitorIndex: number = 0;
    private secondaryMonitorIndex: number = 0;
    private settingConnections: number[] = [];
    private focusConnection?: number;

    enable(): void {
        this._settings = this.getSettings();
        this.primaryMonitorIndex = global.display.get_primary_monitor();
        this.secondaryMonitorIndex = this._settings.get_int('secondary-monitor');
        if (this._settings!.get_boolean('pointer-follows-focus')) {
            this.focusConnection = global.display.connect(
                'focus-window',
                this._on_focus_window.bind(this)
            );
        }

        Main.wm.addKeybinding(
            KeybindSettings.SwapMonitors,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL,
            this._swap_monitors.bind(this)
        );

        Main.wm.addKeybinding(
            KeybindSettings.MoveFocusLeft,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL,
            this._move_focus_direction.bind(this, Meta.DisplayDirection.LEFT)
        );

        Main.wm.addKeybinding(
            KeybindSettings.MoveFocusRight,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL,
            this._move_focus_direction.bind(this, Meta.DisplayDirection.RIGHT)
        );

        this.settingConnections.push(
            this._connect_pointer_follows_focus(),
            this._connect_secondary_monitor(),
        );
    }

    private _connect_secondary_monitor(): number {
        return this._settings!.connect('changed::secondary-monitor', (settings: Gio.Settings, key: string) => {
            this.secondaryMonitorIndex = settings.get_int(key);
        });
    }

    private _connect_pointer_follows_focus(): number {
        return this._settings!.connect('changed::pointer-follows-focus', (settings: Gio.Settings, key: string) => {
            if (settings.get_boolean(key) && !this.focusConnection) {
                this.focusConnection = global.display.connect(
                    'focus-window',
                    this._on_focus_window.bind(this)
                );
            }

            if (!settings.get_boolean(key) && this.focusConnection) {
                global.display.disconnect(this.focusConnection);
                this.focusConnection = undefined;
            }
        });
    }

    disable(): void {
        Main.wm.removeKeybinding(KeybindSettings.SwapMonitors);
        Main.wm.removeKeybinding(KeybindSettings.MoveFocusLeft);
        Main.wm.removeKeybinding(KeybindSettings.MoveFocusRight);
        
        if (this.focusConnection) {
            global.display.disconnect(this.focusConnection);
        }

        for (const connection of this.settingConnections) {
            this._settings!.disconnect(connection);
        }
    }

    private _on_focus_window(_: Meta.Display, window: Meta.Window): void {
        if (!window) return;

        if (!window.has_pointer()) {
            const rect = window.get_frame_rect();
            Clutter.get_default_backend()
                .get_default_seat()
                .warp_pointer(
                    rect.x + Math.floor(rect.width / 2),
                    rect.y + Math.floor(rect.height / 2)
                );
        }
    }

    private _move_focus_direction(direction: Meta.DisplayDirection) {
        const focusedMonitorIndex = global.display.get_focus_window()?.get_monitor() ?? this.primaryMonitorIndex;
        const targetMonitor = global.display.get_monitor_neighbor_index(focusedMonitorIndex, direction);

        const displayWindows = global.display
            .list_all_windows()
            .filter((window) => window.get_monitor() === targetMonitor)
        const targetWindow = global.display.sort_windows_by_stacking(displayWindows).reverse().find((window) => window.window_type === Meta.WindowType.NORMAL);

        if (targetWindow) {
            targetWindow.focus(global.get_current_time());
        }
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
