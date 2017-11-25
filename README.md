# fr.genuinedev.calendar
JS lib to access calendar in titanium

# Usage

```javascript
require('calendar').handle(function() {
    require('calendar').getCalendar(function(_cal) {
        if (_cal) {
            Ti.API.info("Cal ID:" + _cal.id + " Name:" + _cal.name);
            if (require('calendar').createEvent(_cal, {
                begin: '2015-04-13T21:00:00+02:00',
                end: '2015-04-13T22:00:00+02:00',
                title: 'My first event',
                notes: 'Custom notes about this event',
                location: 'The address to go to…'
            })) {
                Ti.API.info("Event created");
            } else {
              Ti.API.info("Event not created");
            }
        }
    });
});
```

# TO DO

- [ ] Less pass a pure Appcelerator event object to calendar.createEvent
- [ ] Do a simpler way to create event
