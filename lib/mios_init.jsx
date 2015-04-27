try {
    mios.build();
    if ( errors = mios.getErrors() ) alert( errors );
} catch (e) {
    alert( 'Program error' );
}