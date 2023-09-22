import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';


export function createSwitch({ title, subtitle = '', settings, settingId }) {
    const row = new Adw.ActionRow({ title });
    row.set_subtitle(subtitle);

    const toggle = new Gtk.Switch({
        active: settings.get_boolean(settingId),
        valign: Gtk.Align.CENTER,
    });

    row.add_suffix(toggle);
    row.activatable_widget = toggle;

    settings.bind(
        settingId,
        toggle,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );

    return { row, toggle };
}

export function createRadio({ title, subtitle = '', value, group = null, settings, settingId }) {
    const row = new Adw.ActionRow({ title });
    row.set_subtitle(subtitle);

    const radio = new Gtk.CheckButton();
    radio.set_active(settings.get_int(settingId) === value);
    radio.connect('toggled', () => settings.set_int(settingId, value));

    if (group) {
        radio.set_group(group);
    }


    row.add_prefix(radio);
    row.activatable_widget = radio;

    return { row, radio };
}

export function createSlider({ title, subtitle = '', min = 1, max = 100, step = 1, settings, settingId }) {
    const row = new Adw.ActionRow({ title });
    row.set_subtitle(subtitle);

    const slider = new Gtk.Scale({
        digits: 0,
        adjustment: new Gtk.Adjustment({ lower: min, upper: max, stepIncrement: step }),
        value_pos: Gtk.PositionType.RIGHT,
        hexpand: true,
        halign: Gtk.Align.END
    });

    slider.set_draw_value(true);
    slider.set_value(settings.get_int(settingId));
    slider.connect('value-changed', (sw) => settings.set_int(settingId, sw.get_value()));
    slider.set_size_request(200, 15);

    row.add_suffix(slider);
    row.activatable_widget = slider;

    return { row, slider };
}
