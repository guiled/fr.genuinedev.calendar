var Agenda = {};

function showCalendarSelector(_cb) {
    // On a plusieurs calendrier, on propose à l'utilisateur d'en choisir un
    var calendarNames = [],
        calendarIds = [],
        idx = 0;

    // Création de la liste des noms de calendrier
    // et de la liste des ids correspondants
    Ti.Calendar.selectableCalendars.forEach(function(_calendar) {
        calendarNames[idx] = _calendar.name;
        calendarIds[idx] = _calendar.id;
        idx++;
    });

    // Création d'une fenêtre
    var dialog = Ti.UI.createOptionDialog({
        title : L('agendaChoose'),
        buttonNames : [L('cancel')],
        options : calendarNames,
        cancel : 0
    });

    var clickHandler = function(e) {
        dialog.removeEventListener('click', clickHandler);
        clickHandler = null;
        dialog = null;

        // Le calendrier sélectionné est dans e.source.selectedIndex
        if (e && e.source && typeof e.source.selectedIndex !== 'undefined' && Ti.Calendar.selectableCalendars[e.source.selectedIndex]) {
            Ti.App.Properties.setString(Alloy.CFG.appProperties.defaultCalendarId, Ti.Calendar.selectableCalendars[e.index].id);
            _cb(Ti.Calendar.selectableCalendars[e.index]);
            return;
        }

        // WTF e.cancel === true quand on choisit le premier calendrier dans la liste!
        // Donc il faut tester l'existence de e.source.selectedIndex
        if (e.cancel) {
            _cb(false);
            return;
        }
        _cb(false);
    };

    dialog.addEventListener('click', clickHandler);
    dialog.show();
};

Agenda.getCalendar = function(_cb) {
    // Récupération du calendrier qui aurait sélectionné avant
    Ti.API.info("lib/calendar Get Calendar id from app properties");
    var selectedCalendarId = Ti.App.Properties.getString(Alloy.CFG.appProperties.defaultCalendarId, null);

    // L'application a l'id du dernier calendrier sélectionné
    if (selectedCalendarId) {
        Ti.API.info("lib/calendar Calendar id found in app properties");
        var calendar = Ti.Calendar.getCalendarById(selectedCalendarId);
        Ti.API.info("lib/calendar Cvalendar id ' + calendar.id);

        if (calendar) {
            _cb(calendar);
            calendar = null;
            return;
        }
    }

    if (OS_IOS) {
        Ti.API.info("lib/calendar Get default Calendar id");
        var cal = Ti.Calendar.getDefaultCalendar();
        Ti.App.Properties.setString(Alloy.CFG.appProperties.defaultCalendarId, cal.id);
        _cb(cal);
        cal = null;
    } else {
        // Sur Android, on récupère les calendriers
        if (Ti.Calendar.selectableCalendars.length === 0) {
            require('hrautils').alert(L('agendaNoCalendar'));
            return;
        }

        // On n'a qu'un seul calendrier disponible
        if (Ti.Calendar.selectableCalendars.length === 1 && Ti.Calendar.selectableCalendars[0] && Ti.Calendar.selectableCalendars[0].id) {
            _cb(Ti.Calendar.selectableCalendars[0]);
            return;
        }

        showCalendarSelector(_cb);

    }
};

/**
 * Crée un évènement dans le calendrier
 *
 * @author gduthieuw@houra.fr
 *
 * @param {Ti.Calendar.Calendar} _calendar Le calendrier dans lequel il faut ajouter l'event
 * @param {Object} _event Les données de l'évènement à ajouter au calendrier
 * @param {String} _event.begin Date au format ISO8601 2015-04-13T21:00:00+02:00
 * @param {String} _event.end Date au format ISO8601 2015-04-13T21:00:00+02:00
 * @param {String} _event.title Titre du rendez-vous
 * @param {String} [_event.notes] Texte descriptif du rendez-vous
 * @param {String} [_event.location] Adresse du rendez-vous
 *
 * @return {Ti.Calendar.Event|Boolean} L'évènement créé, false si l'évènement n'est pas créé
 */
Agenda.createEvent = function(_calendar, _event) {
    if (!_calendar) {
        Ti.API.error("lib/calendar Missing calendar");
        return false;
    }
    if (!_event || !_event.begin || !_event.end || !_event.title) {
        Ti.API.error("lib/calendar Missing data to create event ' + JSON.stringify(_event));
        return false;
    }
    var dateBegin = new Date(_event.begin);
    var dateEnd = new Date(_event.end);
    if (isNaN(dateBegin.getTime()) || isNaN(dateEnd.getTime())) {
        Ti.API.error("lib/calendar Invalid dates ' + JSON.stringify(_event));
        return false;
    }
    Ti.API.info("lib/calendar Event dates ' + dateBegin + '->' + dateEnd);

    var event = _calendar.createEvent({
        title : _event.title,
        notes : _event.notes,
        location : _event.location,
        begin : dateBegin,
        end : dateEnd,
        availability : Ti.Calendar.AVAILABILITY_FREE,
        allDay : false
    });
    // Sur Android, il n'y a pas de méthode save
    if (OS_IOS) {
        event.save();
    }
    if (!event) {
        Ti.API.error("lib/calendar Error creating the event");
        return false;
    }
    Ti.API.info("lib/calendar Event created");
    return event;
};

Agenda.handle = function(_callback) {
    if (OS_ANDROID) {
        _callback();
    } else {
        Ti.API.info("lib/calendar Check authorizations");
        switch (Ti.Calendar.eventsAuthorization) {
        case Ti.Calendar.AUTHORIZATION_UNKNOWN:
            Ti.API.info("lib/calendar Authorizations unknown");
            // L'appareil demande l'autorisation à l'utilisateur
            Ti.Calendar.requestEventsAuthorization(function(e) {
                if (e.success) {
                    Ti.API.info("lib/calendar Authorizations granted");
                    _callback();
                }
            });
            break;
        case Ti.Calendar.AUTHORIZATION_AUTHORIZED:
            // L'application a déjà le droit d'accéder au calendrier
            Ti.API.info("lib/calendar Authorizations already granted");
            Ti.Calendar.requestEventsAuthorization(function(e) {
                Ti.API.info("lib/calendar Authorizations success : ' + e.success);
                if (e.success) {
                    _callback();
                }
            });
            break;
        default:
            // L'application n'a pas le droit d'accéder au calendrier
            Ti.API.info("lib/calendar Authorizations already refused"'");
            require('hrautils').confirm({
                title : L('agendaAccessNeededTitle'),
                message : L('agendaAccessNeededDesc'),
                buttons : [L('param'), L('cancel')],
                onAccept : function() {
                    Ti.API.info("lib/calendar User accepted to go to settings"'");
                    // On ouvre le paramétrage système de l'appli pour inviter l'utilisateur à donner l'autorisation
                    var settingsURL = Ti.App.iOS.applicationOpenSettingsURL;
                    if (Ti.Platform.canOpenURL(settingsURL)) {
                        Ti.Platform.openURL(settingsURL);
                    }
                }
            });
        }
    }
};

module.exports = Agenda;
