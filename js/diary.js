// global vars
var skv_dates = {};
var skv_events_by_uid = {};

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
 *  I get the start and end of a given period
 *
 *  @param first_of_this_period the first day of the currently displayed period in format "YYYY-MM-DD"
 *  @param type string direction, 'previous', 'current' or 'next'
 *  @return object of first and last dates
 */

function getKeyDates( first_of_this_period, type ){

    var skv_key_dates = {};

    switch ( type ) {

        case 'previous' :

            skv_dates.first_day = moment( first_of_this_period )
                .subtract( 1, 'weeks' )
                .format( api_date_format );

            skv_dates.last_day = moment( first_of_this_period )
                .add( 1, 'weeks' )
                .format( api_date_format );

        break;

        case 'current' :

            skv_dates.first_day = moment( first_of_this_period )
                .format( api_date_format );

            skv_dates.last_day = moment( first_of_this_period )
                .add( 2, 'weeks' )
                .format( api_date_format );
                
        break;

        case 'next' :

            skv_dates.first_day = moment( first_of_this_period )
                .add( 1, 'weeks' )
                .format( api_date_format );

            skv_dates.last_day = moment( first_of_this_period )
                .add( 3, 'weeks' )
                .format( api_date_format );
                
        break;

    }

    return skv_key_dates;
}


/**
 *  I update the summary summary list based on input from calendar navigation controls
 *
 *  @return none
 */

function updateCalendar( skv_key_dates ){

    $( '.calendar-control .this-week' )
        .attr( 'data-first_of_this_period', skv_dates.first_day );

    getCalendarData( skv_dates.first_day, skv_dates.last_day );
}


/**
 *  I attach click handlers to calendar navigation controls
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
 *  I attach click handlers to event-summary items to show their details
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
 *  I show event modal with detailed description of an event if clicked on in the summary list view
 *
 *  @param event_uid the unique id of the event
 *  @return none
 */

function showEventDetails( event_uid ){


    var first_of_this_period = $( '.calendar-control .this-week' )
        .attr( 'data-first_of_this_period' );
    var skv_event = skv_events_by_uid[ event_uid ];

    // YES, I'm deliberately testing for a number as a string 
    // which is apparently how this comes back from the API
    var is_ticketed = skv_event.signup_options.tickets.enabled === "1";

    var str_html = '<div class="event-details">'
        + '<h2>' + skv_event.name + '</h2>'
        + htmlDecode( skv_event.description )
        + '<br /><br /><p><strong>Venue:</strong> <a href="https://www.google.co.uk/maps/@' 
        + skv_event.location.latitude + ',' + skv_event.location.longitude 
        + ',17z" target="_blank">'
        + skv_event.location.name + '</a></p>';
    
    if( skv_event.is_multi_day ){
        str_html += skv_event.str_multi_full_dates;
    } else {
        str_html += buildDateString( skv_event.datetime_start, skv_event.datetime_end );
    }

    str_html += '<br />';

    if( is_ticketed ){
        str_html += 'For full event details and tickets, see the '
        + '<a href="' + skv_event.signup_options.tickets.url 
        + '">event details</a> page.';
    }

    var img_src = '';
    var has_img = true;

    try {
        img_src = skv_event.images.md.url;
    } catch( err ){
        has_img = false;
    }

    $( '#eventModal .modal-header' )
        .empty();

    var btn_markup = '<button type="button" class="close" data-dismiss="modal" aria-label="Close">'
        + '<span aria-hidden="true">&times;</span></button>';

    $( '#eventModal .modal-header' )
            .append( btn_markup );

    if( has_img ){
        $( '#eventModal .modal-header' )
            .append( '<img class="modal-img" src="' + img_src + '" />' );
    }

    $( '#eventModal .modal-body' )
        .empty()
        .append( str_html );
    
    $( '#eventModal' ).modal( 'show' );

}


/**
 *  I get data from the churchApp JSON feed based on a date range
 *
 *  @param first_day start of range in format "YYYY-MM-DD"
 *  @param last_day end of range in format "YYYY-MM-DD"
 *  @return none
 */

function getCalendarData( first_day, last_day ){

    var date_format = 'dddd, Do MMMM YYYY h:mm a';

    $.ajax({
        url: 'https://woodlands.churchapp.co.uk/embed/calendar/json',
        type: 'GET',
        dataType: 'jsonp',
        data: {
            date_start: first_day,
            date_end: last_day 
        }
    })
    .done(function( data ) {
        buildSummaryListData( data, first_day, last_day );
    });
}


/**
 *  I remove URL encoding
 *
 *  @param input string of urlencoded html
 *  @return html string
 */

function htmlDecode( input ){
    var e = document.createElement( 'div' );
    e.innerHTML = input;
    return e.childNodes[0].nodeValue;
}


/**
 *  I build date strings for different lengths of events
 *
 *  @param start start of event in format "YYYY-MM-DD h:mm:ss"
 *  @param end end of event in format "YYYY-MM-DD h:mm:ss"
 *  @return html string
 */

function buildDateString( start, end ){

    var m_start = moment( start );
    var m_end = moment( end );
    var str_html = '';

    // multiday event
    if( m_start.format( 'YYYY-MM-DD' ) !== m_end.format( 'YYYY-MM-DD' ) ){


        str_html += '<p><strong>Start:</strong> ' 
            + m_start.format( date_format ) + '</p>'
            + '<p><strong>End:</strong> ' 
            + m_end.format( date_format ) + '</p>';
    
    // single day event
    } else {

        str_html += '<p><strong>Date: </strong>' 
            + m_start.format( 'dddd, Do MMMM YYYY' ) + '</p>'
            + '<p><strong>Time: </strong>' 
            + m_start.format( 'h:mm a' ) + ' - ' 
            + m_end.format( 'h:mm a' ) + '</p>';
    }

    return str_html;

}


/**
 *  I process eventDays: whole events and days of multiday events
 *  I am a void function which modifies the global skv_event object as a side effect
 *
 *  @param start_date_string the start date of the event in api_date_format
 *  @param skv_event an object containing the event data
 *  @param skv_dates a struct of all of the dates to edit and return
 */

function processSingleEventDay( start_date_string, skv_event ){

    // put event struct in to global event array for access later
    skv_events_by_uid[ skv_event.event_uid ] = skv_event;

    if( !skv_dates.hasOwnProperty( start_date_string ) ){
    
        skv_dates[ start_date_string ] = {
            'date'       : start_date_string,
            'arr_events' : [ skv_event ]
        };

    } else {
        skv_dates[ start_date_string ].arr_events.push( skv_event );
    }

}


/**
 *  I loop over all data returned from the API call, organise it and call a markup fn
 *
 *  @param data struct of data
 *  @return none
 */

function buildSummaryListData( data, first_day, last_day ){

    // set global skv_event back to an empty object to avoid repitition
    skv_dates = {};

    data.forEach( function( skv_event ){

        // don't want to display Highgrove events
        if( skv_event.location 
            && skv_event.location.name === 'Highgrove Church' ){
            return false;
        }

        var start_date = moment( skv_event.datetime_start );
        var end_date = moment( skv_event.datetime_end );
        var start_date_string = moment( start_date ).format( api_date_format );
        var event_duration_days = end_date.diff( start_date, 'days' );
        // force string concatenation with '' to start
        skv_event.event_uid = '' + skv_event.id + start_date_string
        skv_event.is_multi_day = false;


        // handle multi day events
        if( event_duration_days > 1 ){

            skv_event.is_multi_day = true;
            skv_event.str_multi_full_dates = buildDateString( start_date, end_date );

            var this_date = moment( start_date );
            start_date_string = '';

            for( i = 0; i <= event_duration_days; i++ ){

                var skv_temp_event = JSON.parse( JSON.stringify( skv_event ) );

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

                    // if this is the last day of a multiday event and it doesn't end at midnight,
                    // add time override indicating end time 
                    if( moment( skv_event.datetime_end ).format( 'HH:mm:ss' ) !== "23:59:59" ){
                        skv_temp_event.str_override_time = 'Ends at ' + moment( skv_event.datetime_end ).format( 'h:mm a' );
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
                skv_event
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

    var str_html = markup;
    var loop_date = moment( first_day );
    var week_end = moment( first_day ).add( 6, 'days'); 
    
    var skv_week = {
        arr_weekdays: [],
        skv_sunday: {}
    };

    while ( loop_date.isSameOrBefore( week_end )
            && loop_date.isSameOrBefore( moment( last_day ) ) ) {

        if( skv_dates[ loop_date.format('YYYY-MM-DD') ] ){
            
            this_date = skv_dates[ loop_date.format('YYYY-MM-DD') ];
            if( loop_date.format( 'dddd' ) === 'Sunday' ){
                skv_week.skv_sunday = this_date;
            } else {
                skv_week.arr_weekdays.push( this_date );
            }
        }

        // this is the looping logic
        loop_date = loop_date.add(1, 'days');
    }

    str_html += buildSummaryListMarkupSingleWeek( first_day, skv_week );

    // call myself recursively to build markup for future weeks
    if( loop_date.isBefore( moment( last_day ) ) ){
        var new_first_day = loop_date.format('YYYY-MM-DD');
        return buildSummaryListMarkupAll( new_first_day, last_day, str_html );

    // no more weeks required, use built markup
    } else {
        updateMarkup( str_html );
    }

}


/**
 *  I build the markup for a single week and return it
 *  NB that empty sections are populated with an explanatory note
 *
 *  @param first_day the date of the first day of the week
 *  @param skv_week the week object to build markup for
 *  @return html string
 */

function buildSummaryListMarkupSingleWeek( first_day, skv_week ){

    var str_html = '<div class="week">'
        + buildWeekTitle( first_day );

    // build markup for weekdays
    str_html += '<div class="weekdays">';
    if( skv_week.arr_weekdays.length ){
        skv_week.arr_weekdays.forEach(function(skv_date){
            str_html += buildSingleDay( skv_date );
        });
    } else {
        str_html += '<div class="date-container">'
        + '<div class="title-wrap"><span class="title">'
        + 'No events scheduled Monday - Saturday this week.'
        + '</span></div></div>';
    }
    
    str_html += '</div>';

    // build markup for sunday
    str_html += '<div class="sunday">';
    if( skv_week.skv_sunday.arr_events ){
        str_html += buildSingleDay( skv_week.skv_sunday );
    } else {
        str_html += '<div class="date-container">'
        + '<div class="title-wrap"><span class="title">'
        + 'No events scheduled on this Sunday.'
        + '</span></div></div>';
    }

    str_html += '</div>';
    str_html += '</div>';

    return str_html;

}


/**
 *  I build the markup for a single day and return it
 *
 *  @param skv_date the date object to build markup for
 *  @return html string
 */

function buildSingleDay( skv_date ){
    var date_string = moment( skv_date.date ).format( 'Do MMMM' );
    var day_name = moment( skv_date.date ).format( 'dddd' );

    var str_html = '<div class="date-container">'
        + '<div class="title-wrap"><span class="title">'
        + '<span class="day-name">' + day_name + '</span>, ' 
        + date_string + '</span></div>';

    // Loop over events on specific date
    skv_date.arr_events.forEach( function( skv_event ){

        time_string = moment( skv_event.datetime_start ).format( 'h:mm a' );
        
        if( skv_event.hasOwnProperty( 'str_override_time' ) ){
            time_string = skv_event.str_override_time;
        }

        if( moment( skv_event.datetime_start ).format( 'HH:mm:ss' ) === "00:00:00" 
            && moment( skv_event.datetime_end ).format( 'HH:mm:ss' ) === "23:59:59" ){
            time_string = "All day";
        }


        str_html += '<div class="event-summary" data-event_uid="' 
            + skv_event.event_uid +'">' 
            + '<span class="event-name">' +  skv_event.name + '</span> ' 
            + '<span class="event-time">' + time_string + '</span>' 
            + '</div>';
    });

    // close .date-container
    str_html += '</div>';

    return str_html;

}


/**
 *  I update the markup on the page
 *
 *  @param str_html html string
 *  @return none
 */

function updateMarkup( str_html ){

    var str_html = '<div class="calendar-summary">'
        + str_html + '</div>';

    $( '.calendar .event-details' ).remove();
    $( '.calendar .calendar-summary' ).remove();
    $( '.calendar' ).append( str_html );

    attachCalendarControlClickHandlers();
    attachEventSummaryClickHandler()

}
