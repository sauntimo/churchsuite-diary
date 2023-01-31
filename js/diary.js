// global vars
var ALL_DATES = {};
var ALL_EVENTS_BY_UID = {};

var date_format = 'dddd, Do MMMM YYYY h:mm a';
var api_date_format = 'YYYY-MM-DD';
var arr_months = [ 'January','February','March','April','May', 'June',
    'July','August','September','October','November','December' ];


$(document).ready(function($) {

    (function init(){

        var first_of_this_period = moment().startOf( 'isoweek' ).format( api_date_format );

        $( '.this-week' )
            .attr( 'data-first_of_this_period', first_of_this_period );

        var first_day = moment()
            .startOf( 'isoweek' )
            .format( api_date_format );

        var last_day = moment()
            .endOf( 'isoweek' )
            .add( 1, 'weeks' )
            .format( api_date_format );

        getCalendarData( first_day, last_day );

    })();

});


/**
 *  Get the start and end of a given period
 *
 *  @param first_of_this_period the first day of the currently displayed period in format "YYYY-MM-DD"
 *  @param type string direction, 'previous', 'current' or 'next'
 *  @return object of first and last dates
 */

function getKeyDates( first_of_this_period, type ){

    var keyDates = {};

    switch ( type ) {

        case 'previous' :

            ALL_DATES.first_day = moment( first_of_this_period )
                .subtract( 1, 'weeks' )
                .format( api_date_format );

            ALL_DATES.last_day = moment( first_of_this_period )
                .add( 1, 'weeks' )
                .format( api_date_format );

        break;

        case 'current' :

            ALL_DATES.first_day = moment( first_of_this_period )
                .format( api_date_format );

            ALL_DATES.last_day = moment( first_of_this_period )
                .add( 2, 'weeks' )
                .format( api_date_format );

        break;

        case 'next' :

            ALL_DATES.first_day = moment( first_of_this_period )
                .add( 1, 'weeks' )
                .format( api_date_format );

            ALL_DATES.last_day = moment( first_of_this_period )
                .add( 3, 'weeks' )
                .format( api_date_format );

        break;

    }

    return keyDates;
}


/**
 *  Update the summary list based on input from calendar navigation controls
 *
 *  @return none
 */

function updateCalendar( skv_key_dates ){

    $( '.calendar-control .this-week' )
        .attr( 'data-first_of_this_period', ALL_DATES.first_day );

    getCalendarData( ALL_DATES.first_day, ALL_DATES.last_day );
}


/**
 *  Attach click handlers to calendar navigation controls
 *
 *  @return none
 */

function attachCalendarControlClickHandlers(){

    $( '.calendar-control .this-week' ).off();
    $( '.calendar-control .this-week' ).click(function(event) {
        var first_of_current_period = moment()
            .startOf( 'week' )
            .format( api_date_format );
        updateCalendar( getKeyDates( first_of_current_period, 'current' ) );
    });

    $( '.calendar-control .previous-period' ).off();
    $( '.calendar-control .previous-period' ).click(function(event) {
        var passed_date = $( '.calendar-control .this-week' ).attr( 'data-first_of_this_period' );
        updateCalendar( getKeyDates( passed_date, 'previous' ) )
    });

    $( '.calendar-control .next-period' ).off();
    $( '.calendar-control .next-period' ).click(function(event) {
        var passed_date = $( '.calendar-control .this-week' ).attr( 'data-first_of_this_period' );
        updateCalendar( getKeyDates( passed_date, 'next' ) )
    });

}


/**
 *  Attach click handlers to event-summary items to show their details
 *
 *  @return none
 */

function attachEventSummaryClickHandler(){

    $( '.event-summary' ).off();
    $( '.event-summary' ).click(function(event) {
        var event_uid = $( this ).attr( 'data-event_uid' );
        showEventDetails( event_uid );
    });

}


/**
 *  Show event modal with detailed description of an event if clicked on in the summary list view
 *
 *  @param event_uid the unique id of the event
 *  @return none
 */

function showEventDetails( event_uid ){

    var event = ALL_EVENTS_BY_UID[ event_uid ];

    // ensure there is a preceding hash for the colour hex
    const brandColour = event.brand.color[0] === '#'
        ? event.brand.color
        : `#${event.brand.color}`;

    const mapsURL = `https://www.google.co.uk/maps/@${event.location.latitude},${event.location.longitude},17z`;


    const dates = event.is_multi_day
        ? event.str_multi_full_dates
        : buildDateString( event.datetime_start, event.datetime_end );

    // deliberately testing for a number as a string which is how this comes from the API
    const tickets = event.signup_options.tickets.enabled === "1"
        ? `For full event details and tickets, see the <a href="${event.signup_options.tickets.url}">event details</a> page.`
        : "";

    var html = `
        <style>h2, .branded { color: ${brandColour}; }</style>
            <div class="event-details">
                <h2>${event.name}</h2>
                ${(event.description === null ? "" : event.description + '<br />')}
                <p>
                    <strong>Venue:</strong> <a href="${mapsURL}" target="_blank">${event.location.name}</a>
                </p>
                ${dates}
                <br />
                ${tickets}`;

    $( '#eventModal .modal-header' )
        .empty();

    var btn_markup = '<button type="button" class="close" data-dismiss="modal" aria-label="Close">'
        + '<span aria-hidden="true">&times;</span></button>';

    $( '#eventModal .modal-header' )
            .append( btn_markup );

    if( event.images?.md?.url ){
        $( '#eventModal .modal-header' )
            .append( `<img class="modal-img" src="${event.images.md.url}" />` );
    }

    $( '#eventModal .modal-body' )
        .empty()
        .append( html );

    $( '#eventModal' ).modal( 'show' );

}


/**
 *  Get data from the churchApp JSON feed based on a date range
 *
 *  @param first_day start of range in format "YYYY-MM-DD"
 *  @param last_day end of range in format "YYYY-MM-DD"
 *  @return none
 */

function getCalendarData( first_day, last_day ){

    $.ajax({
        url: 'https://woodlands.churchsuite.co.uk/embed/calendar/json',
        type: 'GET',
        dataType: 'jsonp',
        data: {
            date_start: first_day,
            date_end: last_day,
            site_ids: [1],
        }
    })
    .done(function( data ) {
        buildSummaryListData( data, first_day, last_day );
    });
}

/**
 *  Build date strings for different lengths of events
 *
 *  @param start start of event in format "YYYY-MM-DD h:mm:ss"
 *  @param end end of event in format "YYYY-MM-DD h:mm:ss"
 *  @return html string
 */

function buildDateString( start, end ){

    var m_start = moment( start );
    var m_end = moment( end );
    var html = '';

    // multi-day event
    if( m_start.format( 'YYYY-MM-DD' ) !== m_end.format( 'YYYY-MM-DD' ) ){


        html += '<p><strong>Start:</strong> '
            + m_start.format( date_format ) + '</p>'
            + '<p><strong>End:</strong> '
            + m_end.format( date_format ) + '</p>';

    // single day event
    } else {

        html += '<p><strong>Date: </strong>'
            + m_start.format( 'dddd, Do MMMM YYYY' ) + '</p>'
            + '<p><strong>Time: </strong>'
            + m_start.format( 'h:mm a' ) + ' - '
            + m_end.format( 'h:mm a' ) + '</p>';
    }

    return html;

}


/**
 *  Process eventDays: whole events and days of multi-day events
 *  Void function which modifies the global ALL_EVENTS object as a side effect
 *
 *  @param start_date_string the start date of the event in api_date_format
 *  @param event an object containing the event data
 *  @param ALL_DATES a struct of all of the dates to edit and return
 */

function processSingleEventDay( start_date_string, event ){

    // put event struct in to global event array for access later
    ALL_EVENTS_BY_UID[ event.event_uid ] = event;

    if( !ALL_DATES.hasOwnProperty( start_date_string ) ){

        ALL_DATES[ start_date_string ] = {
            'date'       : start_date_string,
            'arr_events' : [ event ]
        };

    } else {
        ALL_DATES[ start_date_string ].arr_events.push( event );
    }

}


/**
 *  Loop over all data returned from the API call, organise it and call a markup fn
 *
 *  @param data struct of data
 *  @return none
 */

function buildSummaryListData( data, first_day, last_day ){

    // set global skv_event back to an empty object to avoid repetition
    ALL_DATES = {};

    data.forEach( function( event ){
        var start_date = moment( event.datetime_start );
        var end_date = moment( event.datetime_end );
        var start_date_string = moment( start_date ).format( api_date_format );
        var event_duration_days = end_date.diff( start_date, 'days' );
        // force string concatenation with '' to start
        event.event_uid = '' + event.id + start_date_string
        event.is_multi_day = false;


        // handle multi day events
        if( event_duration_days > 1 ){

            event.is_multi_day = true;
            event.str_multi_full_dates = buildDateString( start_date, end_date );

            var this_date = moment( start_date );
            start_date_string = '';

            for( i = 0; i <= event_duration_days; i++ ){

                var skv_temp_event = JSON.parse( JSON.stringify( event ) );

                start_date_string = moment( this_date ).format( api_date_format );


                if( i === 0 ){

                    skv_temp_event.datetime_end = moment( this_date ).endOf( 'day' )
                        .format( "YYYY-MM-DD HH:mm:ss" );
                }

                if( i > 0 && i < event_duration_days ){

                    skv_temp_event.datetime_start = moment( this_date ).startOf( 'day' )
                        .format( "YYYY-MM-DD HH:mm:ss" );
                    skv_temp_event.datetime_end = moment( this_date ).endOf( 'day' )
                        .format( "YYYY-MM-DD HH:mm:ss" );
                }

                if( i === event_duration_days ){

                    skv_temp_event.datetime_start = moment( this_date ).startOf( 'day' )
                        .format( "YYYY-MM-DD HH:mm:ss" );

                    // if this is the last day of a multi-day event and it doesn't end at midnight,
                    // add time override indicating end time
                    if( moment( event.datetime_end ).format( 'HH:mm:ss' ) !== "23:59:59" ){
                        skv_temp_event.str_override_time = 'Ends at ' + moment( event.datetime_end ).format( 'h:mm a' );
                    }

                }

                this_date = moment( this_date ).add( 1, 'days' );

                // force string concatenation with '' to start
                skv_temp_event.event_uid = '' + skv_temp_event.id + start_date_string
                processSingleEventDay(
                    start_date_string,
                    skv_temp_event
                );
            }
        } else {
            processSingleEventDay(
                start_date_string,
                event
            );
        }

    });

    buildSummaryListMarkupAll( first_day, last_day, '' );

}


/**
 *  I build a week title for a give start date
 *
 *  @param start_date the first day of the week (monday) in format "YYYY-MM-DD"
 *  @return html string
 */

function buildWeekTitle( start_date ){

    var week_from = moment( start_date ).startOf( 'isoweek' );
    var week_to = moment( start_date ).endOf( 'isoweek' );

    var diff_months = ( week_to.format( 'MMMM' ) !== week_from.format( 'MMMM' ) );
    var to_format = diff_months ? 'Do MMMM' : 'Do';

    var week_title = week_from.format( to_format ) + ' - '
        + week_to.format( 'Do MMMM' );

    return '<div class="week-title-wrap"><div class="week-title">'
        + week_title
        + '</div></div>';

}


/**
 *  I build the mark up for the calendar summary
 *  Weeks are added recursively until the last_day is reached
 *
 *  @param first_day the first date of the range
 *  @param last_day the last date of the range
 *  @param markup html string passed in
 *  @return html string
 */

function buildSummaryListMarkupAll( first_day, last_day, markup ){

    var html = markup;
    var loop_date = moment( first_day );
    var week_end = moment( first_day ).add( 6, 'days');

    var week = {
        arr_weekdays: [],
        skv_sunday: {}
    };

    while ( loop_date.isSameOrBefore( week_end )
            && loop_date.isSameOrBefore( moment( last_day ) ) ) {

        if( ALL_DATES[ loop_date.format('YYYY-MM-DD') ] ){

            this_date = ALL_DATES[ loop_date.format('YYYY-MM-DD') ];
            if( loop_date.format( 'dddd' ) === 'Sunday' ){
                week.skv_sunday = this_date;
            } else {
                week.arr_weekdays.push( this_date );
            }
        }

        // this is the looping logic
        loop_date = loop_date.add(1, 'days');
    }

    html += buildSummaryListMarkupSingleWeek( first_day, week );

    // call myself recursively to build markup for future weeks
    if( loop_date.isBefore( moment( last_day ) ) ){
        var new_first_day = loop_date.format('YYYY-MM-DD');
        return buildSummaryListMarkupAll( new_first_day, last_day, html );

    // no more weeks required, use built markup
    } else {
        updateMarkup( html );
    }

}


/**
 *  I build the markup for a single week and return it
 *  NB that empty sections are populated with an explanatory note
 *
 *  @param first_day the date of the first day of the week
 *  @param week the week object to build markup for
 *  @return html string
 */

function buildSummaryListMarkupSingleWeek( first_day, week ){

    var html = '<div class="week">'
        + buildWeekTitle( first_day );

    // build markup for weekdays
    html += '<div class="weekdays">';
    if( week.arr_weekdays.length ){
        week.arr_weekdays.forEach(function(skv_date){
            html += buildSingleDay( skv_date );
        });
    } else {
        html += `
            <div class="date-container">
                <div class="title-wrap">
                    <span class="title">
                        No events scheduled Monday - Saturday this week.
                    </span>
                </div>
            </div>`;
    }

    html += '</div>';

    // build markup for sunday
    html += '<div class="sunday">';
    if( week.skv_sunday.arr_events ){
        html += buildSingleDay( week.skv_sunday );
    } else {
        html += `
            <div class="date-container">
                <div class="title-wrap">
                    <span class="title">
                        No events scheduled on this Sunday.
                    </span>
                </div>
            </div>`;
    }

    html += '</div>';
    html += '</div>';

    return html;

}


/**
 *  I build the markup for a single day and return it
 *
 *  @param date the date object to build markup for
 *  @return html string
 */

function buildSingleDay( date ){
    var date_string = moment( date.date ).format( 'Do MMMM' );
    var day_name = moment( date.date ).format( 'dddd' );

    var html = `<div class="date-container">
        <div class="title-wrap">
            <span class="title">
                <span class="day-name">${day_name}</span>,
                ${date_string}
            </span>
        </div>`;

    // Loop over events on specific date
    date.arr_events.forEach( function( event ){

        time_string = moment( event.datetime_start ).format( 'h:mm a' );

        if( event.hasOwnProperty( 'str_override_time' ) ){
            time_string = event.str_override_time;
        }

        if( moment( event.datetime_start ).format( 'HH:mm:ss' ) === "00:00:00"
            && moment( event.datetime_end ).format( 'HH:mm:ss' ) === "23:59:59" ){
            time_string = "All day";
        }


        html += `<div class="event-summary" data-event_uid="${event.event_uid}">
            <span class="event-name">${event.name}</span>
            <span class="event-time">${time_string}</span>
            </div>`;
    });

    // close .date-container
    html += '</div>';

    return html;

}


/**
 *  I update the markup on the page
 *
 *  @param html html string
 *  @return none
 */

function updateMarkup( html ){

    var html = `<div class="calendar-summary">${html}</div>`;

    $( '.calendar .event-details' ).remove();
    $( '.calendar .calendar-summary' ).remove();
    $( '.calendar' ).append( html );

    attachCalendarControlClickHandlers();
    attachEventSummaryClickHandler()

}
