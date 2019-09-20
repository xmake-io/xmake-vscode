#include "dialogwithbuttonsrighttest.h"
#include "ui_dialogwithbuttonsrighttest.h"

DialogWithButtonsRightTest::DialogWithButtonsRightTest(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::DialogWithButtonsRightTest)
{
    ui->setupUi(this);
}

DialogWithButtonsRightTest::~DialogWithButtonsRightTest()
{
    delete ui;
}
