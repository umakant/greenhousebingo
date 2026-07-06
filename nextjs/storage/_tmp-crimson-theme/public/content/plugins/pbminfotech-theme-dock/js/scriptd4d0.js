/* JS Code */

function pbmdock_overlay_bg(){

    if( jQuery('.pbmit-overlay-bg').hasClass('active') ){

        jQuery('.pbmit-overlay-bg').animate({
            "opacity":"0",
        }, 500, function(){
            jQuery('.pbmit-overlay-bg').removeClass('active').hide();
        });

    } else {

        //jQuery('.pbmit-overlay-bg').addClass('active').show();
        jQuery('.pbmit-overlay-bg').addClass('active').show().animate({
            "opacity":"1",
        }, 500, function(){
            //  do nohting
        });

    }
}


jQuery(document).ready(function() {  
    
    
    jQuery('.pbmit-btn, .pbmit-overlay-bg').on('click', function(){
        pbmdock_overlay_bg();
        jQuery('.pbmdock-main').toggleClass('active');
        //jQuery('.pbmit-overlay-bg').toggleClass('active');
    });

    jQuery('.pbmdock-inner').scrollbar();
    
 });  




