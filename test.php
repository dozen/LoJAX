<?php

if(isset($_GET['getA']))
{
	echo('GET parameter "A" has the value "' . $_GET['getA'] . '"');
	echo("\n");
}
if(isset($_GET['getB']))
{
	echo('GET parameter "B" has the value "' . $_GET['getB'] . '"');
	echo("\n");
}
if(isset($_POST['postA']))
{
	echo('POST parameter "A" has the value "' . $_POST['postA'] . '"');
	echo("\n");
}
if(isset($_POST['postB']))
{
	echo('POST parameter "B" has the value "' . $_POST['postB'] . '"');
	echo("\n");
}


?>