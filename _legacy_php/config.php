<?php
session_start();

define('ADMIN_KEY', 'rocknroll');
define('DB_PATH', __DIR__ . '/database/made4jam.sqlite');

function getDB() {
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $db;
}