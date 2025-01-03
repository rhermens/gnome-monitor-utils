import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import Adw from "gi://Adw";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { KeybindSettings } from './settings.js';

export default class MonitorUtilsPreferences extends ExtensionPreferences {
    private _settings?: Gio.Settings;
    private _displays?: Gdk.Display | null;

    async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        this._settings = this.getSettings();
        this._displays = Gdk.Display.get_default();
        if (!this._displays) {
            throw new Error('No displays found');
        }

        const page = new Adw.PreferencesPage();

        page.add(this.monitorPreferenceGroup());
        page.add(this.keybindPreferenceGroup());
        page.add(this.pointerBehaviourPreferenceGroup());

        window.add(page);
    }

    private pointerBehaviourPreferenceGroup() {
        const pointerBehaviourPreferenceGroup = new Adw.PreferencesGroup({
            title: 'Pointer Behaviour',
        });

        const pointerFollowsFocusToggle = new Adw.SwitchRow({
            title: 'Pointer follows focus',
        });

        this._settings!.bind(
            'pointer-follows-focus',
            pointerFollowsFocusToggle,
            'active',
            Gio.SettingsBindFlags.DEFAULT,
        );

        pointerBehaviourPreferenceGroup.add(pointerFollowsFocusToggle);
        return pointerBehaviourPreferenceGroup;
    }

    private keybindPreferenceGroup() {
        const keybindPreferenceGroup = new Adw.PreferencesGroup({
            title: 'Keybindings',
        });

        const swapMonitorsKeybind = new Adw.EntryRow({
            title: 'Swap Monitors',
            text: this._settings?.get_strv(KeybindSettings.SwapMonitors)[0],
            show_apply_button: true,
        });
        swapMonitorsKeybind.connect('apply', () => {
            this._settings?.set_strv(KeybindSettings.SwapMonitors, [swapMonitorsKeybind.text]);
        });

        const moveFocusLeftKeybind = new Adw.EntryRow({
            title: 'Move focus left',
            text: this._settings?.get_strv(KeybindSettings.MoveFocusLeft)[0],
            show_apply_button: true,
        });
        moveFocusLeftKeybind.connect('apply', () => {
            this._settings?.set_strv(KeybindSettings.MoveFocusLeft, [moveFocusLeftKeybind.text]);
        });

        const moveFocusRightKeybind = new Adw.EntryRow({
            title: 'Move focus right',
            text: this._settings?.get_strv(KeybindSettings.MoveFocusRight)[0],
            show_apply_button: true,
        });
        moveFocusRightKeybind.connect('apply', () => {
            this._settings?.set_strv(KeybindSettings.MoveFocusRight, [moveFocusRightKeybind.text]);
        });

        keybindPreferenceGroup.add(swapMonitorsKeybind);
        keybindPreferenceGroup.add(moveFocusLeftKeybind);
        keybindPreferenceGroup.add(moveFocusRightKeybind);
        return keybindPreferenceGroup;
    }

    private monitorPreferenceGroup() {
        const monitorPreferencesGroup = new Adw.PreferencesGroup({
            title: 'Monitor',
        })

        const comboRow = new Adw.ComboRow({
            title: 'Secondary Monitor',
            model: this._displays!.get_monitors(),
            expression: Gtk.ClosureExpression.new(GObject.TYPE_STRING, (item: Gdk.Monitor) => {
                return item.get_connector();
            }, []),
        });

        this._settings!.bind(
            'secondary-monitor',
            comboRow,
            'selected',
            Gio.SettingsBindFlags.DEFAULT,
        );

        monitorPreferencesGroup.add(comboRow);
        return monitorPreferencesGroup;
    }
}
