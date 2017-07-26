var date_format = 'dddd, Do MMMM YYYY h:mm a';
var api_date_format = 'YYYY-MM-DD';
var arr_months = [ 'January','February','March','April','May', 'June',
    'July','August','September','October','November','December' ];

$(document).ready(function($) {

    // global vars
    skv_events_by_uid = {};
    count_individual_dates = 0;

    (function init(){

        var first_of_this_period = moment().startOf( 'week' ).format( api_date_format );

        $( '.this-week' )
            .attr( 'data-first_of_this_period', first_of_this_period );

        var first_day = moment()
            .startOf( 'week' )
            .add( 1, 'days' )
            .format( api_date_format );
        
        var last_day = moment()
            .endOf( 'week' )
            .add( 8, 'days' )
            .format( api_date_format );

        getCalendarData( first_day, last_day );

        attachCalendarControlClickHandlers();

    })();

    /**
     *  I get the start and end of a give period
     *
     *  @param first_of_this_period the first day of the currently displayed period in format "YYYY-MM-DD"
     *  @param type string direction, 'previous', 'current' or 'next'
     *  @return object of first and last dates
     */

    function getKeyDates( first_of_this_period, type ){

        var skv_dates = {};

        switch ( type ) {

            case 'previous' :

                skv_dates.first_day = moment( first_of_this_period )
                    .subtract( 1, 'weeks' )
                    .startOf( 'week' )
                    .add( 1, 'days' )
                    .format( api_date_format );

                skv_dates.last_day = moment( first_of_this_period )
                    .subtract( 1, 'weeks' )
                    .endOf( 'week' )
                    .add( 8, 'days' )
                    .format( api_date_format );

            break;

            case 'current' :

                skv_dates.first_day = moment( first_of_this_period )
                    .startOf( 'week' )
                    .add( 1, 'days' )
                    .format( api_date_format );

                skv_dates.last_day = moment( first_of_this_period )
                    .endOf( 'week' )
                    .add( 8, 'days' )
                    .format( api_date_format );
                    
            break;

            case 'next' :

                skv_dates.first_day = moment( first_of_this_period )
                    .add( 1, 'weeks' )
                    .startOf( 'week' )
                    .add( 1, 'days' )
                    .format( api_date_format );

                skv_dates.last_day = moment( first_of_this_period )
                    .add( 1, 'weeks' )
                    .endOf( 'week' )
                    .add( 8, 'days' )
                    .format( api_date_format );
                    
            break;

        }

        return skv_dates;
    }

    /**
     *  I update the summary summary list based on input from calendar navigation controls
     *
     *  @return none
     */

    function updateCalendar( skv_dates ){

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

        var str_html = '<div class="event-details">'
            + '<h2>' + skv_event.name + '</h2>'
            + htmlDecode( skv_event.description )
            + '<br /><br /><p><strong>Venue:</strong> <a href="https://www.google.co.uk/maps/@' 
            + skv_event.location.latitude + ',' + skv_event.location.longitude 
            + ',17z" target="_blank">'
            + skv_event.location.name + '</a></p>'
            + buildDateString( skv_event.datetime_start, skv_event.datetime_end )
            + '<br />';

        var img_src = '';
        var has_img = true;

        try {
            img_src = skv_event.images.md.url;
        } catch( err ){
            has_img = false;
        }

        $( '#eventModal .modal-header' )
            .empty();

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
     *
     *  @param start_date_string the start date of the event in api_date_format
     *  @param skv_event an object containing the event data
     *  @param skv_dates a struct of all of the dates to edit and return
     *  @return skv_dates
     */

    function processSingleEventDay( start_date_string, skv_event, skv_dates ){

        // put event struct in to global event array for access later
        skv_events_by_uid[ skv_event.event_uid ] = skv_event;

        if( !skv_dates.hasOwnProperty( start_date_string ) ){
        
            count_individual_dates++;

            skv_dates[ start_date_string ] = {
                'order'      : count_individual_dates,
                'date'       : start_date_string,
                'arr_events' : [ skv_event ]
            };

        } else {
            skv_dates[ start_date_string ].arr_events.push( skv_event );
        }

        return skv_dates;

    }

    /**
     *  I loop over all data returned from the API call, organise it and call a markup fn
     *
     *  @param data struct of data
     *  @return none
     */

    function buildSummaryListData( data, first_day, last_day ){

        var skv_dates = {};
        var arr_dates = [];
        var count_individual_dates = 0;

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

            // handle multi day events
            if( event_duration_days > 1 ){

                var this_date = moment( start_date );
                start_date_string = '';

                for( i = 0; i <= event_duration_days; i++ ){

                    start_date_string = moment( this_date ).format( api_date_format );
                    this_date = moment( this_date ).add( 1, 'days' );


                    if( i === 1 ){
                        skv_event.datetime_end = moment( this_date ).endOf( 'day' )
                            .format( "YYYY-MM-DD HH:mm:ss" );
                    }

                    if( i > 1 && i < event_duration_days ){
                        skv_event.datetime_start = moment( this_date ).startOf( 'day' )
                            .format( "YYYY-MM-DD HH:mm:ss" );
                        skv_event.datetime_end = moment( this_date ).endOf( 'day' )
                            .format( "YYYY-MM-DD HH:mm:ss" );
                    }

                    if( i === event_duration_days ){
                        skv_event.datetime_start = moment( this_date ).startOf( 'day' )
                            .format( "YYYY-MM-DD HH:mm:ss" );
                    }

                    // force string concatenation with '' to start
                    skv_event.event_uid = '' + skv_event.id + start_date_string
                    skv_dates = processSingleEventDay( 
                        start_date_string,
                        skv_event,
                        skv_dates
                    );
                }
            } else {
                skv_dates = processSingleEventDay(
                    start_date_string,
                    skv_event,
                    skv_dates
                );
            }

        });

        for( var key in skv_dates ){
            arr_dates.push( skv_dates[ key ] );
        }

        arr_dates.sort(function(a,b){
            return (a.order > b.order) 
                ? 1 
                : ((b.order > a.order) ? -1 : 0);
        });

        buildSummaryListMarkup( arr_dates, first_day, last_day );

    }

    /**
     *  I build a week title for a give start date
     *
     *  @param start_date the first day of the week (monday) in format "YYYY-MM-DD"
     *  @return html string
     */


    function buildWeekTitle( start_date ){

        var week_from = moment( start_date ).startOf( 'week' ).add( 1, 'days' );
        var week_to = moment( start_date ).endOf( 'week' ).add( 1, 'days' );

        var week_title = week_from.format( 'Do' ) + ' - '
            + week_to.format( 'Do MMMM' );

        return '<div class="week-title-wrap"><div class="week-title">'
            + week_title
            + '</div></div>';

    }

    /**
     *  I build the mark up for the calendar summary - event titles and times by date, and put it on the page
     *
     *  @param arr_dates array of structs for each date with events
     *  @param start_date the first date of the range
     *  @param end_date the last date of the range
     *  @return none 
     */


    function buildSummaryListMarkup( arr_dates, first_day, last_day ){

        var str_html = '<div class="calendar-summary">';
        str_html += '<div class="week">'
            + buildWeekTitle( arr_dates[0].date )
            + '<div class="weekdays">';

        // Loop over individual dates
        arr_dates.forEach( function( skv_date, index ){

            // ignore multi day events starting before the range starts
            if( moment( skv_date.date ).isBefore( moment( first_day ) ) ){
                var deleted = arr_dates.splice( index, 1 );
                return;
            }

            // ignore multi day events ending after the range ends
            if( moment( skv_date.date ).isAfter( moment( last_day ) ) ){
                var deleted = arr_dates.splice( index, 1 );
                return;
            }

            var day_name = moment( skv_date.date ).format( 'dddd' );

            if( day_name == 'Sunday' ){
                str_html += '</div><div class="sunday">'
            }

            var date_string = moment( skv_date.date ).format( 'dddd, Do MMMM' );

            str_html += '<div class="date-container">';
            str_html += '<div class="title-wrap"><span class="title">'
                + '<span class="day-name">' + day_name + '</span>, ' 
                + date_string.replace( day_name + ', ', '' ) + '</span></div>';

            // Loop over events on specific date
            skv_date.arr_events.forEach( function( skv_event ){

                time_string = moment( skv_event.datetime_start ).format( 'h:mm a' );
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

            if( moment( skv_date.date ).format( 'dddd' ) == 'Sunday'
                && ( skv_date.date != arr_dates[ arr_dates.length - 1 ].date ) ){
                str_html += '</div></div></div><div class="week">'
                    + buildWeekTitle( skv_date.date )
                    + '<div class="weekdays">'
            } else {
                str_html += '</div>';
            }


        });

        str_html += '</div>';

        $( '.calendar .event-details' ).remove();
        $( '.calendar .calendar-summary' ).remove();
        $( '.calendar' ).append( str_html );

        attachCalendarControlClickHandlers();
        attachEventSummaryClickHandler()

    }

});