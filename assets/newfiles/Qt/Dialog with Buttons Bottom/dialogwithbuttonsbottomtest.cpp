#include "dialogwithbuttonsbottomtest.h"
#include "ui_dialogwithbuttonsbottomtest.h"

DialogWithButtonsBottomTest::DialogWithButtonsBottomTest(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::DialogWithButtonsBottomTest)
{
    ui->setupUi(this);
}

DialogWithButtonsBottomTest::~DialogWithButtonsBottomTest()
{
    delete ui;
}
