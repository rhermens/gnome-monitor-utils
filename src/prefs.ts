import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import Adw from "gi://Adw";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

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

        const preferencesGroup = new Adw.PreferencesGroup({
            title: 'Monitor',
        })

        const comboRow = new Adw.ComboRow({
            title: 'Secondary Monitor',
            model: this._displays.get_monitors(),
            expression: Gtk.ClosureExpression.new(GObject.TYPE_STRING, (item: Gdk.Monitor) => {
                return item.get_connector();
            }, []),
        });

        this._settings.bind(
            'secondary-monitor',
            comboRow,
            'selected',
            Gio.SettingsBindFlags.DEFAULT,
        );

        preferencesGroup.add(comboRow);
        page.add(preferencesGroup);
        window.add(page);
    }
}
